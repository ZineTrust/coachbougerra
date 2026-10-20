"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  removeGroupMessageAction,
  sendGroupMessageAction,
  staffRemoveGroupMessageAction,
  staffSendGroupMessageAction,
} from "@/actions/groups";
import { VoiceBubble } from "@/components/groups/VoiceBubble";
import { useErrorText } from "@/components/ui/form";
import type { Locale } from "@/i18n/routing";
import { GROUP_MESSAGE_MAX, GROUP_POLL_MS, VOICE_MAX_SECONDS } from "@/lib/groups";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";
import { canRecordVoice, MicDenied, VoiceRecorder } from "@/lib/voice-recorder";

interface Msg {
  id: number;
  fromStaff: boolean;
  code: number | null;
  name: string | null;
  mine: boolean;
  body: string;
  /** a voice note: its length in seconds */
  voice: { seconds: number } | null;
  removed: boolean;
  createdAt: string;
}

/** Ask for the whole list again this often, so messages removed by others disappear. */
const FULL_REFRESH_EVERY = 6;

/**
 * The messages of one group and the box to write in. It asks the server for new messages every
 * few seconds while the page is in front. The same chat serves members and the team: the team
 * reads any group (and also sees what was removed) and writes as "Équipe".
 */
export function GroupChat({
  groupId,
  mode,
  canPostInitially,
  isAdminInitially,
  voiceReady = false,
}: {
  groupId: number;
  mode: "member" | "team";
  canPostInitially: boolean;
  isAdminInitially: boolean;
  /** the storage for voice notes is set up */
  voiceReady?: boolean;
}) {
  const t = useTranslations("groups");
  const err = useErrorText();
  const locale = useLocale() as Locale;

  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [canPost, setCanPost] = useState(canPostInitially);
  const [isAdmin, setIsAdmin] = useState(isAdminInitially);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  // voice notes: the recording in progress, how long it is, and whether one is being sent
  const [recorder, setRecorder] = useState<VoiceRecorder | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastId = useRef(0);
  const ticks = useRef(0);

  const url = useCallback(
    (after: number | null) => {
      const query = new URLSearchParams();
      if (after !== null) query.set("after", String(after));
      if (mode === "team") query.set("as", "team");
      else if (document.visibilityState === "visible") query.set("read", "1");
      const qs = query.toString();
      return `/api/groups/${groupId}/messages${qs ? `?${qs}` : ""}`;
    },
    [groupId, mode],
  );

  const load = useCallback(
    async (full: boolean) => {
      try {
        const res = await fetch(url(full || lastId.current === 0 ? null : lastId.current), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { messages: Msg[]; canPost: boolean; isAdmin: boolean };
        setCanPost(data.canPost);
        setIsAdmin(data.isAdmin);
        setFailed(false);
        if (full || lastId.current === 0) {
          setMessages(data.messages);
        } else if (data.messages.length > 0) {
          setMessages((current) => {
            const known = new Set((current ?? []).map((m) => m.id));
            return [...(current ?? []), ...data.messages.filter((m) => !known.has(m.id))];
          });
        }
        const newest = data.messages[data.messages.length - 1]?.id;
        if (newest !== undefined && (full || newest > lastId.current)) lastId.current = newest;
      } catch {
        setFailed(true);
      }
    },
    [url],
  );

  // load now, then every few seconds while the page is in front
  useEffect(() => {
    const first = setTimeout(() => void load(true), 0);
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      ticks.current += 1;
      void load(ticks.current % FULL_REFRESH_EVERY === 0);
    }, GROUP_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // keep the newest message in view, unless the reader scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = () => {
    const body = text.trim();
    if (!body || pending) return;
    startTransition(async () => {
      const result =
        mode === "team"
          ? await staffSendGroupMessageAction(groupId, body)
          : await sendGroupMessageAction(groupId, body);
      if (result.ok) {
        setText("");
        setFormError(undefined);
        stickToBottom.current = true;
        await load(false);
      } else {
        setFormError(result.errors?.body ?? result.errors?.form ?? "generic");
      }
    });
  };

  const remove = (id: number) => {
    if (!window.confirm(t("removeConfirm"))) return;
    startTransition(async () => {
      const result =
        mode === "team"
          ? await staffRemoveGroupMessageAction(groupId, id)
          : await removeGroupMessageAction(groupId, id);
      if (result.ok) {
        setMessages((current) =>
          (current ?? []).map((m) =>
            m.id === id ? { ...m, removed: true, body: mode === "team" ? m.body : "" } : m,
          ),
        );
      } else {
        setFormError(result.errors?.form ?? "generic");
      }
    });
  };

  // the microphone is only known in the browser
  useEffect(() => {
    const check = window.setTimeout(() => setVoiceSupported(voiceReady && canRecordVoice()), 0);
    return () => window.clearTimeout(check);
  }, [voiceReady]);

  const startRecording = async () => {
    setFormError(undefined);
    try {
      setRecorder(await VoiceRecorder.start());
      setElapsed(0);
    } catch (error) {
      setFormError(error instanceof MicDenied ? "voice_denied" : "voice_unsupported");
    }
  };

  const cancelRecording = () => {
    recorder?.cancel();
    setRecorder(null);
  };

  const sendRecording = async () => {
    if (!recorder || sendingVoice) return;
    const current = recorder;
    setRecorder(null);
    setSendingVoice(true);
    try {
      const { blob, seconds } = await current.stop();
      if (seconds < 1 || blob.size === 0) {
        setFormError("voice_short");
        return;
      }
      const query = new URLSearchParams({ seconds: String(Math.min(seconds, VOICE_MAX_SECONDS)) });
      if (mode === "team") query.set("as", "team");
      const res = await fetch(`/api/groups/${groupId}/voice?${query}`, {
        method: "POST",
        headers: { "Content-Type": "audio/mpeg" },
        body: blob,
      });
      if (res.ok) {
        setFormError(undefined);
        stickToBottom.current = true;
        await load(false);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const known = ["cannot_post", "too_many_attempts", "storage_off", "voice_invalid"];
        setFormError(known.includes(data.error ?? "") ? data.error : "voice_failed");
      }
    } catch {
      setFormError("voice_failed");
    } finally {
      setSendingVoice(false);
    }
  };

  // while recording: show the time, and stop by itself at the limit
  useEffect(() => {
    if (!recorder) return;
    const tick = window.setInterval(() => {
      const seconds = recorder.seconds;
      setElapsed(seconds);
      if (seconds >= VOICE_MAX_SECONDS) void sendRecording();
    }, 250);
    return () => window.clearInterval(tick);
    // sendRecording reads the current recorder, which is exactly what this effect depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);

  // leaving the page throws an unfinished recording away and frees the microphone
  useEffect(
    () => () => {
      recorder?.cancel();
    },
    [recorder],
  );

  const author = (m: Msg) =>
    m.fromStaff ? (m.name ?? t("team")) : (m.name ?? t("memberN", { code: m.code ?? 0 }));

  return (
    <div className="flex h-[min(38rem,calc(100dvh-14rem))] min-h-80 flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto bg-ivory-50 p-4">
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
          <p className="py-8 text-center text-sm leading-relaxed text-ink-500">{t("noMessages")}</p>
        )}
        {messages?.map((m) => {
          const mine = m.mine;
          const canRemove = !m.removed && (mode === "team" || mine || isAdmin);
          return (
            <div key={m.id} className={cn("group flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}>
              {mine && canRemove && (
                <RemoveButton onClick={() => remove(m.id)} label={t("removeMessage")} />
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug",
                  mine
                    ? "rounded-se-sm bg-jade-600 text-white"
                    : m.fromStaff
                      ? "rounded-ss-sm bg-gold-100 text-ink-900 ring-1 ring-gold-300/60"
                      : "rounded-ss-sm bg-white text-ink-900 shadow-card",
                  m.removed && "opacity-70",
                )}
              >
                {!mine && (
                  <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold text-jade-700">
                    <span dir="auto">{author(m)}</span>
                    {m.fromStaff ? (
                      <span className="rounded bg-ink-900 px-1.5 py-px text-[9px] uppercase tracking-wide text-gold-300">
                        {t("team")}
                      </span>
                    ) : (
                      m.code !== null && (
                        <span dir="ltr" className="font-medium text-ink-400">
                          #{m.code}
                        </span>
                      )
                    )}
                  </p>
                )}
                {m.removed && !m.body && !m.voice ? (
                  <p className="italic opacity-80">{t("deleted")}</p>
                ) : m.voice ? (
                  <VoiceBubble
                    src={`/api/groups/${groupId}/voice/${m.id}${mode === "team" ? "?as=team" : ""}`}
                    seconds={m.voice.seconds}
                    mine={mine}
                  />
                ) : (
                  <p dir="auto" className={cn("whitespace-pre-line break-words", m.removed && "line-through")}>
                    {m.body}
                  </p>
                )}
                {m.removed && (m.body || m.voice) && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-live">{t("deleted")}</p>
                )}
                <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-ink-400")}>
                  {formatDateTime(new Date(m.createdAt), locale)}
                </p>
              </div>
              {!mine && canRemove && <RemoveButton onClick={() => remove(m.id)} label={t("removeMessage")} />}
            </div>
          );
        })}
      </div>

      {canPost ? (
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
          {recorder || sendingVoice ? (
            <div className="flex items-center gap-2">
              {recorder && (
                <button
                  type="button"
                  onClick={cancelRecording}
                  aria-label={t("voiceCancel")}
                  title={t("voiceCancel")}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ivory-100 hover:text-live"
                >
                  <Trash2 className="size-[18px]" aria-hidden />
                </button>
              )}
              <div
                role="status"
                className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-ivory-50 px-4 text-sm font-semibold ring-1 ring-ink-200"
              >
                {recorder ? (
                  <>
                    <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-live" aria-hidden />
                    <span dir="ltr" className="tabular-nums">
                      {formatDuration(Math.floor(elapsed))}
                    </span>
                    <span className="truncate text-xs font-medium text-ink-500">{t("voiceRecording")}</span>
                  </>
                ) : (
                  <span className="text-ink-500">{t("voiceSending")}</span>
                )}
              </div>
              {recorder && (
                <button
                  type="button"
                  onClick={() => void sendRecording()}
                  aria-label={t("voiceSend")}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition-colors hover:bg-jade-700"
                >
                  <Send className="flip-rtl size-[18px]" aria-hidden />
                </button>
              )}
            </div>
          ) : (
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
              placeholder={mode === "team" ? t("placeholderTeam") : t("placeholder")}
              aria-label={t("placeholder")}
              rows={1}
              maxLength={GROUP_MESSAGE_MAX}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-ivory-50 px-4 py-2.5 text-[15px] ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
            />
            {voiceSupported && !text.trim() ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                aria-label={t("voiceRecord")}
                title={t("voiceRecord")}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition-colors hover:bg-jade-700"
              >
                <Mic className="size-[18px]" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending || !text.trim()}
                aria-label={pending ? t("sending") : t("send")}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition-colors hover:bg-jade-700 disabled:opacity-40"
              >
                <Send className="flip-rtl size-[18px]" aria-hidden />
              </button>
            )}
          </div>
          )}
        </form>
      ) : (
        <p className="border-t border-ink-100 bg-ivory-100 px-4 py-3 text-center text-sm text-ink-600">
          {t("readOnly")}
        </p>
      )}
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mb-1 grid size-7 shrink-0 place-items-center rounded-full text-ink-300 opacity-0 transition-opacity hover:bg-white hover:text-live focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}
