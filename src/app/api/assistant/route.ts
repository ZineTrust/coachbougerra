import { NextResponse, type NextRequest } from "next/server";
import { QUESTION_MAX, STREAM_ERROR_MARK } from "@/lib/assistant";
import type { MemberTitle } from "@/lib/permissions";
import { monthKey } from "@/lib/unlock";
import { dailyLimit } from "@/server/assistant/limit";
import { knowledgeLibrary } from "@/server/assistant/library";
import { buildSystemPrompt, isWeak, pickNotes } from "@/server/assistant/prompt";
import { assistantConfigured, AssistantBusy, streamAnswer, type ChatMessage } from "@/server/assistant/provider";
import {
  addMessage,
  chatBelongsTo,
  chatMessages,
  createChat,
  deleteMessages,
  finishAnswer,
  questionsToday,
} from "@/server/assistant/store";
import { currentMember } from "@/server/current";
import { getGoal } from "@/server/goals";
import { allow } from "@/server/rate-limit";
import { requestsThisMonth } from "@/server/unlocks";

export const dynamic = "force-dynamic";

/** A question shorter than this, with no match of its own, is read as a follow-up to the one before. */
const SHORT_FOLLOW_UP = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const reply = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });

const RANK: Record<MemberTitle, string> = {
  consultant: "Consultant",
  manager: "Manager",
  senior_manager: "Senior Manager",
  director: "Director",
};

/** Members with a question being answered right now (one at a time each). */
const globalForAssistant = globalThis as unknown as { __coachBougerraAsking?: Set<number> };
const asking = (globalForAssistant.__coachBougerraAsking ??= new Set<number>());

/**
 * A member asks a question, the answer comes back as a stream of text. The headers tell the page which
 * conversation and message this is and how many questions are left today.
 */
export async function POST(request: NextRequest) {
  const member = await currentMember();
  if (!member) return reply("unauthorized", 401);
  if (!assistantConfigured()) return reply("assistant_off", 503);

  let input: { message?: unknown; chat?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return reply("bad_request", 400);
  }
  const question = typeof input.message === "string" ? input.message.trim() : "";
  if (!question) return reply("empty", 400);
  if (question.length > QUESTION_MAX) return reply("too_long", 400);

  if (!allow(`assistant:${member.code}`, 8, 60_000)) return reply("too_many_attempts", 429);
  if (asking.has(member.code)) return reply("in_progress", 409);

  const limit = dailyLimit();
  const used = await questionsToday(member.code);
  if (used >= limit) return reply("limit", 429, { limit });

  asking.add(member.code);
  let streaming = false;
  const stored: number[] = [];
  try {
    const chatId =
      typeof input.chat === "number" && Number.isInteger(input.chat) && (await chatBelongsTo(input.chat, member.code))
        ? input.chat
        : await createChat(member.code);
    const history = await chatMessages(chatId, 6);

    const [library, goal, requests] = await Promise.all([
      knowledgeLibrary(),
      getGoal(member.code, monthKey()),
      requestsThisMonth(member.code),
    ]);
    // a short follow-up with nothing to match on its own ("and the price?") borrows the previous question
    const previous = [...history].reverse().find((m) => m.role === "user")?.content;
    let hits = library.search(question, 6);
    if (isWeak(hits) && previous && question.length < SHORT_FOLLOW_UP) {
      const combined = library.search(`${previous} ${question}`, 6);
      if (combined.length > 0 && (hits.length === 0 || combined[0].score > hits[0].score)) hits = combined;
    }
    const system = buildSystemPrompt(
      {
        rank: RANK[member.title],
        goal: goal ? { target: goal.targetPv, current: goal.currentPv } : null,
        unlockedThisMonth: requests.filter((r) => r.status === "approved").length,
      },
      pickNotes(hits),
    );
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...history.map((m) => ({ role: m.role, content: m.role === "assistant" ? m.content.slice(0, 700) : m.content })),
      { role: "user", content: question },
    ];

    stored.push(await addMessage(chatId, "user", question));
    let started;
    try {
      started = await streamAnswer(messages);
    } catch (error) {
      await deleteMessages(stored); // a question that got no answer does not count
      return error instanceof AssistantBusy ? reply("busy", 503) : reply("failed", 502);
    }
    const answerId = await addMessage(chatId, "assistant", "");
    stored.push(answerId);

    const weak = isWeak(hits);
    const encoder = new TextEncoder();
    let full = "";
    let gone = false;
    streaming = true;
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const piece of started.chunks) {
            full += piece;
            if (!gone) controller.enqueue(encoder.encode(piece));
          }
          await finishAnswer(answerId, full, started.model, weak);
        } catch {
          // the answer broke off: keep what was written, or forget the exchange when nothing came
          if (full) await finishAnswer(answerId, full, started.model, weak);
          else await deleteMessages(stored);
          if (!gone) controller.enqueue(encoder.encode(STREAM_ERROR_MARK));
        } finally {
          asking.delete(member.code);
          if (!gone) controller.close();
        }
      },
      cancel() {
        gone = true; // the reader left: the answer is still finished and stored
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-Chat-Id": String(chatId),
        "X-Message-Id": String(answerId),
        "X-Remaining": String(Math.max(0, limit - used - 1)),
      },
    });
  } catch (error) {
    console.error("[assistant] failed:", error);
    await deleteMessages(stored).catch(() => {});
    return reply("failed", 500);
  } finally {
    if (!streaming) asking.delete(member.code);
  }
}
