"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  mine: boolean;
  /** written by the team (the coach or staff) */
  team: boolean;
}

export const CHAT_MAX = 300;

/** The live's chat. Messages only exist while the room is open: someone who arrives late sees what follows. */
export function ChatPanel({
  messages,
  onSend,
  disabled,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("liveRoom");
  const [text, setText] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const stick = useRef(true);

  // follow the conversation, unless the person scrolled up to read
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || disabled) return;
    onSend(clean);
    setText("");
    stick.current = true;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && <li className="py-8 text-center text-sm leading-relaxed text-ink-400">{t("chatEmpty")}</li>}
        {messages.map((m) => (
          <li key={m.id} className="text-sm leading-snug">
            <span
              dir="auto"
              className={cn("font-bold", m.team ? "text-gold-300" : m.mine ? "text-jade-300" : "text-ink-200")}
            >
              {m.mine ? t("you") : m.name}
            </span>
            {m.team && !m.mine && <span className="ms-1.5 rounded bg-gold-400 px-1 py-px text-[0.625rem] font-bold uppercase text-ink-950">{t("team")}</span>}
            <p dir="auto" className="mt-0.5 break-words text-ink-100">
              {m.text}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX}
          disabled={disabled}
          dir="auto"
          placeholder={t("chatPlaceholder")}
          aria-label={t("chatPlaceholder")}
          className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[16px] text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label={t("send")}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white hover:bg-jade-500 disabled:opacity-40"
        >
          <Send className="flip-rtl size-[18px]" aria-hidden />
        </button>
      </form>
    </div>
  );
}
