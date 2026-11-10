import "server-only";

/*
  Talking to the AI service. Groq is used because it has a free plan and no card is needed; it speaks the
  same "chat completions" language as many other services, so another provider (or Claude, through a
  compatible address) can be used by changing ASSISTANT_API_URL, the key and ASSISTANT_MODELS.

  The free plan limits each model separately (requests and tokens per minute and per day), so the models
  are tried one after the other: when one is out of quota (HTTP 429), the next one answers, and the first
  is left alone until its wait is over.
*/

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Every model is busy or out of quota right now. */
export class AssistantBusy extends Error {
  constructor() {
    super("assistant busy");
  }
}

/** Best Arabic and French first; smaller models only when the big ones are used up. */
const DEFAULT_MODELS = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant"];

const BASE_URL = () => (process.env.ASSISTANT_API_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const API_KEY = () => process.env.GROQ_API_KEY?.trim() ?? "";
const models = () => {
  const listed = process.env.ASSISTANT_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return listed && listed.length > 0 ? listed : DEFAULT_MODELS;
};

/** True when the assistant has what it needs to answer (a key for the AI service). */
export const assistantConfigured = () => API_KEY() !== "";

/** Until when (ms since epoch) each model is left alone after a refusal. Kept across hot reloads. */
const globalForProvider = globalThis as unknown as { __coachBougerraCooldown?: Map<string, number> };
const cooldown = (globalForProvider.__coachBougerraCooldown ??= new Map<string, number>());

const FIRST_TOKEN_TIMEOUT_MS = 25_000;
const MAX_ANSWER_TOKENS = 600;

/** One server-sent line ("data: {...}") of a streamed answer: the text it carries, "" for none, null at the end. */
function textOfLine(line: string): string | null {
  if (!line.startsWith("data:")) return "";
  const data = line.slice(5).trim();
  if (data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[] };
    const piece = parsed.choices?.[0]?.delta?.content;
    return typeof piece === "string" ? piece : "";
  } catch {
    return "";
  }
}

/** Reads the streamed body piece by piece. */
async function* pieces(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const text = textOfLine(line);
        if (text === null) return;
        if (text) yield text;
        newline = buffer.indexOf("\n");
      }
    }
    const rest = textOfLine(buffer.trim());
    if (rest) yield rest;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Asks for an answer. Resolves as soon as a model has started answering (so a model that refuses is
 * skipped without the member noticing), with the model used and the rest of the answer as a stream.
 */
export async function streamAnswer(
  messages: ChatMessage[],
): Promise<{ model: string; chunks: AsyncGenerator<string> }> {
  const now = Date.now();
  for (const model of models()) {
    if ((cooldown.get(model) ?? 0) > now) continue;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FIRST_TOKEN_TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL()}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY()}` },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.3,
          max_completion_tokens: MAX_ANSWER_TOKENS,
          // reasoning models spend tokens thinking first: keep it short so the answer comes quickly
          ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        const wait = Number(res.headers.get("retry-after"));
        if (res.status === 429) {
          cooldown.set(model, now + Math.min(Math.max(Number.isFinite(wait) && wait > 0 ? wait : 60, 5), 3600) * 1000);
        } else if (res.status === 401 || res.status === 403) {
          console.error(`[assistant] the AI service refused the key (HTTP ${res.status})`);
          throw new AssistantBusy();
        } else if (res.status >= 500) {
          cooldown.set(model, now + 15_000);
        } else {
          // 400 / 404 / 422: this model name or option is not accepted: leave it alone for a while
          console.error(`[assistant] model ${model} answered HTTP ${res.status}`);
          cooldown.set(model, now + 10 * 60_000);
        }
        continue;
      }

      const stream = pieces(res.body);
      const first = await stream.next();
      clearTimeout(timer);
      if (first.done || !first.value) {
        cooldown.set(model, now + 15_000);
        continue;
      }
      return {
        model,
        chunks: (async function* () {
          yield first.value;
          yield* stream;
        })(),
      };
    } catch (error) {
      if (error instanceof AssistantBusy) throw error;
      // network error or no first token in time: try the next model
      cooldown.set(model, now + 10_000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AssistantBusy();
}
