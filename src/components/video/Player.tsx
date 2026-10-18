"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Lock, Maximize2, Minimize2, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { embedUrl, type VideoSource } from "@/lib/video-source";
import { cn } from "@/lib/utils";
import { Thumb } from "./Thumb";

/** Who is watching, for the moving name over a protected video. */
export interface Viewer {
  code: number;
  name: string;
}

/**
 * The formation's video. The video is hosted elsewhere (YouTube / Vimeo) and shown
 * through its player; `source` is only given to the page when the member may watch,
 * so a locked page never contains the video's address. `locked` is decided on the
 * server from the member's access rights.
 *
 * `protect` is on for formations that needed PV. A web page cannot truly stop a
 * screen recorder, so this is a deterrent, not a guarantee:
 *  - the viewer's number and name drift across the picture (a leak can be traced),
 *  - the picture goes black and the video pauses whenever the window loses focus or
 *    the tab is hidden (what happens when a recorder or screenshot tool takes over)
 *    and when a screenshot key is pressed,
 *  - fullscreen is our own (the host's button is hidden), so the moving name stays on screen.
 * Only the video host's DRM can make recordings come out black on every device:
 * that is chosen together with the video hosting.
 */
export function Player({
  video,
  locked,
  source = null,
  protect = false,
  viewer = null,
}: {
  video: Video;
  locked: boolean;
  source?: VideoSource | null;
  protect?: boolean;
  viewer?: Viewer | null;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [blackout, setBlackout] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const guard = protect && !locked && Boolean(source);
  const provider = source?.provider;

  useEffect(() => {
    if (!guard) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // ask the host's player to pause (their documented message API)
    const pauseVideo = () => {
      const target = frameRef.current?.contentWindow;
      if (!target) return;
      target.postMessage(
        provider === "youtube"
          ? JSON.stringify({ event: "command", func: "pauseVideo", args: [] })
          : JSON.stringify({ method: "pause" }),
        "*",
      );
    };
    const cover = () => {
      setBlackout(true);
      pauseVideo();
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
  }, [guard, provider]);

  // our own fullscreen: only offered where the browser can fullscreen a page element (not iPhone)
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === stageRef.current);
    const frame = window.setTimeout(() => setCanFullscreen(Boolean(document.fullscreenEnabled)), 0);
    document.addEventListener("fullscreenchange", sync);
    return () => {
      window.clearTimeout(frame);
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

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

  // open to this viewer, but staff have not linked the video yet
  if (!source) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-900 shadow-lift">
        <Thumb video={video} unlocked fill showPlay={false} showBadges={false} />
        <div className="absolute inset-0 grid place-items-center bg-ink-950/55 p-4 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/90 text-ink-900 shadow-lg sm:size-16">
              <Clapperboard className="size-6 sm:size-7" aria-hidden />
            </span>
            <p className="mt-3 font-display text-xl font-semibold text-white sm:mt-4 sm:text-3xl">
              {t("video.comingSoon")}
            </p>
            <p className="mx-auto mt-1 hidden max-w-xs text-sm text-ink-200 sm:block">
              {t("video.comingSoonText")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative overflow-hidden bg-black shadow-lift",
        fullscreen ? "size-full rounded-none" : "aspect-video rounded-2xl",
        guard && "select-none",
      )}
      onContextMenu={guard ? (e) => e.preventDefault() : undefined}
    >
      <iframe
        ref={frameRef}
        src={embedUrl(source)}
        title={video.title[locale]}
        className="absolute inset-0 size-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />

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

      {guard && (
        <span className="pointer-events-none absolute start-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold text-jade-300 backdrop-blur">
          <ShieldCheck className="size-3.5" aria-hidden /> {t("video.protected")}
        </span>
      )}

      {canFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-3 end-3 z-20 grid size-10 place-items-center rounded-full bg-ink-950/70 text-white backdrop-blur hover:bg-ink-950/90"
          aria-label={fullscreen ? t("video.exitFullscreen") : t("video.fullscreen")}
        >
          {fullscreen ? <Minimize2 className="size-[18px]" aria-hidden /> : <Maximize2 className="size-[18px]" aria-hidden />}
        </button>
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
