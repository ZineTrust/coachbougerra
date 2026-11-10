"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Plus, Send, Sparkles, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { newChatAction, rateAnswerAction } from "@/actions/assistant";
import { QUESTION_MAX, STREAM_ERROR_MARK } from "@/lib/assistant";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { RichText } from "./RichText";

export interface StoredChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  rating: number | null;
}

interface Msg {
  /** a stable key for React: the stored id once known */
  key: string;
  id: number | null;
  role: "user" | "assistant";
  content: string;
  rating: 1 | -1 | null;
  /** the answer is still arriving */
  pending?: boolean;
  /** the answer broke off */
  broken?: boolean;
}

const KNOWN_ERRORS = [
  "limit",
  "busy",
  "too_many_attempts",
  "in_progress",
  "too_long",
  "assistant_off",
  "unauthorized",
] as const;

const ERROR_CODES = new Set<string>([...KNOWN_ERRORS, "network", "failed"]);

class AskError extends Error {
  constructor(
    readonly code: string,
    readonly limit?: number,
  ) {
    super(code);
  }
}

const SUGGESTIONS = ["unlock", "prospect", "objection", "plan", "products", "other"] as const;

/** The chat: the conversation, the box to write in, and the answer arriving word by word. */
export function AssistantChat({
  initialChat,
  initialMessages,
  remaining: initialRemaining,
}: {
  initialChat: number | null;
  initialMessages: StoredChatMessage[];
  /** questions the member can still ask today */
  remaining: number;
}) {
  const t = useTranslations("assistant");
  const [messages, setMessages] = useState<Msg[]>(() =>
    initialMessages.map((m) => ({
      key: `s${m.id}`,
      id: m.id,
      role: m.role,
      content: m.content,
      rating: m.rating === 1 || m.rating === -1 ? m.rating : null,
    })),
  );
  const [chatId, setChatId] = useState<number | null>(initialChat);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; limit?: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // keep the newest words in view, unless the reader scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, error]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // leaving the page stops the reading (the server still finishes and stores the answer)
  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = (key: string, change: Partial<Msg>) =>
    setMessages((current) => current.map((m) => (m.key === key ? { ...m, ...change } : m)));

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setBusy(true);
    setText("");
    stickToBottom.current = true;

    const stamp = Date.now();
    const userKey = `u${stamp}`;
    const botKey = `a${stamp}`;
    setMessages((current) => [
      ...current,
      { key: userKey, id: null, role: "user", content: q, rating: null },
      { key: botKey, id: null, role: "assistant", content: "", rating: null, pending: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    let written = "";
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, chat: chatId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; limit?: number };
        const code = KNOWN_ERRORS.find((k) => k === data.error) ?? "failed";
        if (code === "limit") setRemaining(0);
        throw new AskError(code, data.limit);
      }

      const answerId = Number(res.headers.get("X-Message-Id"));
      const chat = Number(res.headers.get("X-Chat-Id"));
      const left = res.headers.get("X-Remaining");
      if (chat) setChatId(chat);
      if (left !== null && Number.isFinite(Number(left))) setRemaining(Number(left));
      patch(botKey, { id: answerId || null });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        written += decoder.decode(value, { stream: true });
        patch(botKey, { content: written.replace(STREAM_ERROR_MARK, "") });
      }
      written += decoder.decode();
      patch(botKey, {
        content: written.replace(STREAM_ERROR_MARK, "").trim(),
        pending: false,
        broken: written.includes(STREAM_ERROR_MARK),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // the member pressed "stop" or left: keep what was written
        if (written) patch(botKey, { content: written.replace(STREAM_ERROR_MARK, "").trim(), pending: false });
        else setMessages((current) => current.filter((m) => m.key !== botKey));
      } else if (written) {
        patch(botKey, { content: written.replace(STREAM_ERROR_MARK, "").trim(), pending: false, broken: true });
      } else {
        // nothing was answered (and the server forgot the question): put it back to try again
        setMessages((current) => current.filter((m) => m.key !== userKey && m.key !== botKey));
        setText(q);
        setError(e instanceof AskError ? { code: e.code, limit: e.limit } : { code: "network" });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const rate = async (m: Msg, value: 1 | -1) => {
    if (m.id === null) return;
    const next = m.rating === value ? null : value;
    patch(m.key, { rating: next });
    const result = await rateAnswerAction(m.id, next).catch(() => ({ ok: false }));
    if (!result.ok) patch(m.key, { rating: m.rating });
  };

  const copy = async (m: Msg) => {
    if (await copyText(m.content)) {
      setCopied(m.key);
      window.setTimeout(() => setCopied((c) => (c === m.key ? null : c)), 1800);
    }
  };

  const startOver = async () => {
    if (busy) return;
    const { chat } = await newChatAction();
    setChatId(chat);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const errorText = (e: { code: string; limit?: number }) =>
    t(`errors.${ERROR_CODES.has(e.code) ? e.code : "failed"}` as never, {
      limit: e.limit ?? 0,
      max: QUESTION_MAX,
    } as never);

  const empty = messages.length === 0;
  const outOfQuestions = remaining <= 0;

  return (
    <div className="flex h-[min(44rem,calc(100dvh-10rem))] min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2.5">
        <p
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            outOfQuestions ? "bg-live/10 text-live" : "bg-jade-50 text-jade-700",
          )}
        >
          {t("remaining", { count: Math.max(0, remaining) })}
        </p>
        {!empty && (
          <button
            type="button"
            onClick={() => void startOver()}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-600 hover:bg-ivory-100 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden /> {t("newChat")}
          </button>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        className="flex-1 space-y-4 overflow-y-auto bg-ivory-50 p-4"
      >
        {empty && (
          <div className="mx-auto max-w-xl py-4 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-jade-600 text-white">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <h2 className="mt-3 text-lg font-bold">{t("welcomeTitle")}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">{t("welcomeText")}</p>
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-400">{t("suggestionsTitle")}</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    disabled={busy || outOfQuestions}
                    onClick={() => void ask(t(`suggestions.${key}`))}
                    dir="auto"
                    className="rounded-2xl bg-white px-3.5 py-2 text-start text-[0.8125rem] font-medium leading-snug text-ink-700 shadow-card ring-1 ring-ink-900/5 transition-colors hover:bg-jade-50 hover:text-jade-700 disabled:opacity-50"
                  >
                    {t(`suggestions.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.key} className="flex justify-end">
              <p
                dir="auto"
                className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-se-sm bg-jade-600 px-3.5 py-2.5 text-[0.9375rem] leading-snug text-white"
              >
                {m.content}
              </p>
            </div>
          ) : (
            <div key={m.key} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink-900 text-gold-300">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 max-w-[88%]">
                <div className="rounded-2xl rounded-ss-sm bg-white px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-ink-900 shadow-card">
                  {m.content ? (
                    <RichText text={m.content} />
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-ink-500">
                      <span className="flex gap-1" aria-hidden>
                        <span className="size-1.5 animate-pulse rounded-full bg-jade-500" />
                        <span className="size-1.5 animate-pulse rounded-full bg-jade-500 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-pulse rounded-full bg-jade-500 [animation-delay:300ms]" />
                      </span>
                      {t("thinking")}
                    </p>
                  )}
                  {m.broken && <p className="mt-2 text-[0.8125rem] font-medium text-live">{t("interrupted")}</p>}
                </div>

                {!m.pending && m.id !== null && m.content && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-ink-400">
                    <IconButton
                      label={t("helpful")}
                      active={m.rating === 1}
                      onClick={() => void rate(m, 1)}
                      icon={<ThumbsUp className="size-4" aria-hidden />}
                    />
                    <IconButton
                      label={t("notHelpful")}
                      active={m.rating === -1}
                      onClick={() => void rate(m, -1)}
                      icon={<ThumbsDown className="size-4" aria-hidden />}
                    />
                    <IconButton
                      label={copied === m.key ? t("copied") : t("copy")}
                      active={copied === m.key}
                      onClick={() => void copy(m)}
                      icon={
                        copied === m.key ? (
                          <Check className="size-4" aria-hidden />
                        ) : (
                          <Copy className="size-4" aria-hidden />
                        )
                      }
                    />
                    {m.rating === -1 && (
                      <p className="basis-full text-[0.75rem] leading-snug text-ink-600">
                        {t("thanks")} {t("contactHint")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-live/10 px-4 py-3 text-sm font-medium leading-relaxed text-live">
            {errorText(error)}
          </p>
        )}
      </div>

      <form
        className="border-t border-ink-100 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(text);
              }
            }}
            dir="auto"
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            rows={1}
            maxLength={QUESTION_MAX}
            enterKeyHint="send"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-ivory-50 px-4 py-2.5 text-base ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label={t("stop")}
              title={t("stop")}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition-colors hover:bg-ink-700"
            >
              <Square className="size-4 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim() || outOfQuestions}
              aria-label={t("send")}
              title={t("send")}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition-colors hover:bg-jade-700 disabled:opacity-40"
            >
              <Send className="flip-rtl size-[18px]" aria-hidden />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function IconButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-colors hover:bg-white hover:text-ink-700",
        active && "bg-jade-50 text-jade-700",
      )}
    >
      {icon}
    </button>
  );
}
