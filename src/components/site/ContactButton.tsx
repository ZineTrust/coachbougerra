"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { markThreadReadAction, sendMessageAction } from "@/actions/messages";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/components/ui/form";
import { LogoMark } from "@/components/ui/Logo";
import type { Locale } from "@/i18n/routing";
import { cn, formatDateTime } from "@/lib/utils";

interface Msg {
  id: number;
  fromStaff: boolean;
  staffName: string | null;
  body: string;
  createdAt: string;
}

/**
 * The one "contact the team" button, floating on every public page.
 * Members get a chat with the team; visitors are invited to sign in first.
 */
export function ContactButton({ member }: { member: { code: number; unread: number } | null }) {
  const t = useTranslations("contact");
  const c = useTranslations("common");
  const [open, setOpen] = useState(false);

  // unread replies: the server's number first, then live updates from polling;
  // while the panel is open they count as read
  const serverUnread = member?.unread ?? 0;
  const [live, setLive] = useState<{ base: number; value: number } | null>(null);
  const unread = open ? 0 : live && live.base === serverUnread ? live.value : serverUnread;
  const onRead = useCallback(() => setLive({ base: serverUnread, value: 0 }), [serverUnread]);

  useEffect(() => {
    if (!member) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        const data = (await res.json()) as { replies: number };
        if (alive) setLive({ base: serverUnread, value: data.replies });
      } catch {
        /* offline: keep the last number */
      }
    };
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [member, serverUnread]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="fixed bottom-24 end-4 z-40 flex h-[min(34rem,calc(100dvh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl bg-white text-ink-900 shadow-stage ring-1 ring-ink-900/10 sm:end-5 sm:w-[24rem]"
        >
          <header className="flex items-center gap-3 bg-ink-900 px-4 py-3.5 text-white">
            <LogoMark className="size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{t("title")}</p>
              <p className="truncate text-xs text-ink-300">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-full text-ink-300 hover:bg-white/10 hover:text-white"
              aria-label={c("close")}
            >
              <X className="size-5" />
            </button>
          </header>
          {member ? <ContactThread onRead={onRead} /> : <VisitorPrompt />}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread > 0 ? t("buttonWithReplies", { count: unread }) : t("button")}
        className="fixed bottom-5 end-4 z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2.5 rounded-full bg-jade-600 px-4 text-white shadow-[0_14px_30px_-10px_rgb(12_132_103/0.9)] transition-colors hover:bg-jade-700 sm:end-5 sm:px-5"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        <span className="hidden text-sm font-bold sm:inline">{t("button")}</span>
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 grid min-w-[22px] place-items-center rounded-full bg-live px-1.5 text-[11px] font-bold leading-[22px] text-white ring-2 ring-ivory-50">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */

function VisitorPrompt() {
  const t = useTranslations("contact");
  return (
    <div className="flex flex-1 flex-col justify-center gap-5 p-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-jade-50 text-jade-600">
        <MessageCircle className="size-7" aria-hidden />
      </span>
      <div>
        <p className="font-display text-xl font-semibold">{t("loginTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{t("loginText")}</p>
      </div>
      <div className="grid gap-2.5">
        <Button href="/connexion?mode=register" size="md">
          {t("register")}
        </Button>
        <Button href="/connexion" variant="outline" size="md">
          {t("login")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ContactThread({ onRead }: { onRead: () => void }) {
  const t = useTranslations("contact");
  const err = useErrorText();
  const locale = useLocale() as Locale;

  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { messages: Msg[]; unread: number };
      setMessages(data.messages);
      setFailed(false);
      if (data.unread > 0) {
        await markThreadReadAction();
        onRead();
      }
    } catch {
      setFailed(true);
    }
  }, [onRead]);

  // load now, then keep an eye out for replies while the panel stays open
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  // always show the newest message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  const submit = () => {
    const body = text.trim();
    if (!body || pending) return;
    startTransition(async () => {
      const data = new FormData();
      data.set("body", body);
      const result = await sendMessageAction(initialState, data);
      if (result.ok) {
        setText("");
        setFormError(undefined);
        await load();
      } else {
        setFormError(result.errors?.body ?? result.errors?.form ?? "generic");
      }
    });
  };

  return (
    <>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-ivory-50 p-4">
        {messages === null && !failed && (
          <div className="space-y-3" aria-hidden>
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-ivory-200" />
            <div className="ms-auto h-10 w-1/2 animate-pulse rounded-2xl bg-jade-100" />
          </div>
        )}
        {failed && messages === null && (
          <p className="py-8 text-center text-sm text-ink-500">{t("loadError")}</p>
        )}
        {messages?.length === 0 && (
          <p className="py-8 text-center text-sm leading-relaxed text-ink-500">{t("empty")}</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={cn("flex", m.fromStaff ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug",
                m.fromStaff
                  ? "rounded-ss-sm bg-white text-ink-900 shadow-card"
                  : "rounded-se-sm bg-jade-600 text-white",
              )}
            >
              {m.fromStaff && (
                <p className="mb-0.5 text-[11px] font-bold text-jade-700">{m.staffName ?? t("team")}</p>
              )}
              <p dir="auto" className="whitespace-pre-line break-words">{m.body}</p>
              <p className={cn("mt-1 text-[10px]", m.fromStaff ? "text-ink-400" : "text-white/70")}>
                {formatDateTime(new Date(m.createdAt), locale)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="border-t border-ink-100 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {formError && (
          <p role="alert" className="mb-2 text-[13px] font-medium text-live">
            {err(formError)}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            rows={1}
            maxLength={2000}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-ivory-50 px-4 py-2.5 text-[15px] ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label={pending ? t("sending") : t("send")}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition-colors hover:bg-jade-700 disabled:opacity-40"
          >
            <Send className="flip-rtl size-[18px]" aria-hidden />
          </button>
        </div>
      </form>
    </>
  );
}
