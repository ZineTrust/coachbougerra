"use client";

import { useEffect, useState } from "react";
import { Lock, Pause, Play, ShieldCheck, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { cn, formatDuration } from "@/lib/utils";
import { Thumb } from "./Thumb";

/** Who is watching, for the moving name over a protected video. */
export interface Viewer {
  code: number;
  name: string;
}

/**
 * Demo player. It shows the real states (locked / ready / playing) so the
 * interface can be judged; the actual video stream is wired in later.
 * `locked` is decided on the server from the member's access rights.
 *
 * `protect` is on for formations that needed PV. A web page cannot truly stop a
 * screen recorder, so this is a deterrent, not a guarantee:
 *  - the viewer's number and name drift across the picture (a leak can be traced),
 *  - the picture goes black and playback pauses whenever the window loses focus or
 *    the tab is hidden (what happens when a recorder or screenshot tool takes over)
 *    and when a screenshot key is pressed,
 *  - right-click, drag and selection are off.
 * Only the video host's DRM can make recordings come out black on every device:
 * that is chosen together with the video hosting.
 */
export function Player({
  video,
  locked,
  protect = false,
  viewer = null,
}: {
  video: Video;
  locked: boolean;
  protect?: boolean;
  viewer?: Viewer | null;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [playing, setPlaying] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const guard = protect && !locked;

  useEffect(() => {
    if (!guard) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cover = () => {
      setBlackout(true);
      setPlaying(false);
    };
    // the picture only comes back when the window is in front and focused again
    const uncover = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) setBlackout(false);
    };
    const onVisibility = () => (document.hidden ? cover() : uncover());
    const onKey = (e: KeyboardEvent) => {
      const screenshot =
        e.key === "PrintScreen" ||
        (e.metaKey && e.shiftKey && ["Digit3", "Digit4", "Digit5"].includes(e.code));
      if (!screenshot) return;
      cover();
      // a screenshot key puts the picture on the clipboard: replace it with nothing
      navigator.clipboard?.writeText("").catch(() => {});
      clearTimeout(timer);
      timer = setTimeout(uncover, 3000);
    };

    window.addEventListener("blur", cover);
    window.addEventListener("focus", uncover);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", cover);
      window.removeEventListener("focus", uncover);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [guard]);

  if (locked) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-900 shadow-lift">
        <div className="absolute inset-0 scale-110 blur-md">
          <Thumb video={video} fill showPlay={false} showBadges={false} />
        </div>
        <div className="absolute inset-0 grid place-items-center bg-ink-950/65 p-4 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-lg sm:size-16">
              <Lock className="size-6 sm:size-7" aria-hidden />
            </span>
            <p className="mt-3 font-display text-xl font-semibold text-white sm:mt-4 sm:text-3xl">
              {t("video.lockedTitle")}
            </p>
            <p className="mx-auto mt-1 hidden max-w-xs text-sm text-ink-200 sm:block">
              {t("video.lockedText", { pv: video.pv })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-2xl bg-ink-900 shadow-lift",
        guard && "select-none",
      )}
      onContextMenu={guard ? (e) => e.preventDefault() : undefined}
      onDragStart={guard ? (e) => e.preventDefault() : undefined}
    >
      <Thumb video={video} unlocked fill showPlay={false} showBadges={false} />

      {!playing && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 grid place-items-center bg-ink-950/20 transition-colors hover:bg-ink-950/10"
          aria-label={t("video.play", { title: video.title[locale] })}
        >
          <span className="grid size-16 place-items-center rounded-full bg-white/95 text-ink-900 shadow-xl transition-transform hover:scale-105 sm:size-20">
            <Play className="ms-1 size-7 fill-current sm:size-8" aria-hidden />
          </span>
        </button>
      )}

      {playing && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent px-4 pb-3 pt-10" dir="ltr">
          <div className="h-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full animate-progress rounded-full bg-jade-400" />
          </div>
          <div className="mt-3 flex items-center gap-3 text-white">
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15"
              aria-label={t("video.pause")}
            >
              <Pause className="size-5 fill-current" aria-hidden />
            </button>
            <Volume2 className="size-5 text-white/80" aria-hidden />
            <span className="text-xs font-semibold tabular-nums text-white/80">
              0:00 / {formatDuration(video.duration)}
            </span>
          </div>
        </div>
      )}

      {/* the viewer's name, drifting: two copies at opposite points of the loop */}
      {guard && viewer && (
        <>
          {[0, -13].map((delay) => (
            <span
              key={delay}
              dir="ltr"
              aria-hidden
              style={{ animationDelay: `${delay}s` }}
              className="pointer-events-none absolute z-20 max-w-[55%] animate-watermark select-none truncate rounded px-2 py-1 text-[11px] font-bold text-white/30 [text-shadow:0_1px_3px_rgb(0_0_0/0.6)] sm:text-sm"
            >
              #{viewer.code}
              {viewer.name ? ` · ${viewer.name}` : ""}
            </span>
          ))}
        </>
      )}

      <span className="absolute end-3 top-3 z-10 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold text-ink-200 backdrop-blur">
        {t("common.demoPlayer")}
      </span>
      {guard && (
        <span className="absolute start-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold text-jade-300 backdrop-blur">
          <ShieldCheck className="size-3.5" aria-hidden /> {t("video.protected")}
        </span>
      )}

      {/* the black screen */}
      {guard && blackout && (
        <div
          role="status"
          data-blackout
          className="absolute inset-0 z-30 grid place-items-center bg-black p-6 text-center"
        >
          <div>
            <ShieldCheck className="mx-auto size-8 text-white/40" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-white/70">{t("video.paused")}</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-white/45">{t("video.pausedText")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
