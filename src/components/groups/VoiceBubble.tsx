"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn, formatDuration } from "@/lib/utils";

/** Only one voice note plays at a time: starting one stops the other. */
let playing: HTMLAudioElement | null = null;

/**
 * A voice note in the chat: play / pause, how far it is, and its length. The audio is only fetched
 * when it is played for the first time (a chat can hold many notes).
 */
export function VoiceBubble({ src, seconds, mine }: { src: string; seconds: number; mine: boolean }) {
  const t = useTranslations("groups");
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(seconds);
  // the audio is only created on the first play; until then there is nothing to seek in
  const [started, setStarted] = useState(false);

  // leaving the page (or the message disappearing) stops the sound
  useEffect(
    () => () => {
      const el = audio.current;
      if (el) {
        el.pause();
        if (playing === el) playing = null;
      }
    },
    [],
  );

  const element = () => {
    if (audio.current) return audio.current;
    const el = new Audio(src);
    el.preload = "auto";
    el.onplaying = () => setState("playing");
    el.onpause = () => setState("idle");
    el.onended = () => {
      setState("idle");
      setTime(0);
    };
    el.ontimeupdate = () => setTime(el.currentTime);
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setLength(el.duration);
    };
    el.onerror = () => setState("error");
    audio.current = el;
    return el;
  };

  const toggle = async () => {
    const el = element();
    if (!el.paused) {
      el.pause();
      return;
    }
    if (playing && playing !== el) playing.pause();
    playing = el;
    setStarted(true);
    setState("loading");
    try {
      await el.play();
    } catch {
      setState("error");
    }
  };

  const shown = Math.min(time, length);

  return (
    <div className="flex w-56 max-w-full items-center gap-3 sm:w-64" dir="ltr">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={state === "playing" ? t("voicePause") : t("voicePlay")}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          mine ? "bg-white/20 text-white hover:bg-white/30" : "bg-jade-600 text-white hover:bg-jade-700",
        )}
      >
        {state === "loading" ? (
          <Loader2 className="size-[18px] animate-spin" aria-hidden />
        ) : state === "playing" ? (
          <Pause className="size-[18px] fill-current" aria-hidden />
        ) : (
          <Play className="size-[18px] fill-current" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {state === "error" ? (
          <p className={cn("text-xs font-semibold", mine ? "text-white/90" : "text-live")}>{t("voiceUnavailable")}</p>
        ) : (
          <>
            <input
              type="range"
              min={0}
              max={length || 1}
              step={0.1}
              value={shown}
              disabled={!started}
              aria-label={t("voiceSeek")}
              onChange={(e) => {
                const el = audio.current;
                if (el) el.currentTime = Number(e.target.value);
                setTime(Number(e.target.value));
              }}
              className={cn("block h-1 w-full cursor-pointer", mine ? "accent-white" : "accent-jade-600")}
            />
            <p className={cn("mt-1 flex items-center gap-1.5 text-[0.6875rem] tabular-nums", mine ? "text-white/80" : "text-ink-500")}>
              <Mic className="size-3" aria-hidden />
              {formatDuration(Math.floor(state === "idle" && time === 0 ? length : shown))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
