"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Loader2, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDuration } from "@/lib/utils";

export interface FileVideoHandle {
  pause: () => void;
}

/**
 * Plays a video that was uploaded to our storage, with our own controls (so the moving name and the
 * black screen of the protected player stay in charge, and no native download or fullscreen button
 * is there). The address to play from is requested from the website when the player opens, and
 * again if it runs out while someone is watching, then playback carries on from the same second.
 */
export function FileVideo({
  slug,
  coverVersion,
  fullscreen,
  onToggleFullscreen,
  ref,
}: {
  slug: string;
  coverVersion: number | null;
  fullscreen: boolean;
  /** undefined where the browser cannot fullscreen a page element (iPhone) */
  onToggleFullscreen?: () => void;
  ref?: Ref<FileVideoHandle>;
}) {
  const t = useTranslations("video");
  const video = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const resumeAt = useRef<{ time: number; play: boolean } | null>(null);
  const refreshes = useRef(0);
  // a new value makes React build a fresh <video>: a retry must reload even when the new address
  // is the same text as the old one (addresses signed within the same second are identical)
  const [attempt, setAttempt] = useState(0);

  useImperativeHandle(ref, () => ({ pause: () => video.current?.pause() }), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(slug)}/watch`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("no url");
      setFailed(false);
      setUrl(data.url);
      setAttempt((n) => n + 1); // a fresh <video> for the fresh address, never one before it
    } catch {
      setFailed(true);
    }
  }, [slug]);

  useEffect(() => {
    // the first address is fetched once the player is on screen
    const first = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(first);
  }, [load]);

  /** The address ran out or the connection dropped: ask for a new one and carry on from the same second. */
  const recover = () => {
    const el = video.current;
    if (refreshes.current >= 3) {
      setFailed(true);
      return;
    }
    refreshes.current += 1;
    resumeAt.current = { time: el?.currentTime ?? 0, play: el ? !el.paused : false };
    void load();
  };

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const shown = Math.min(time, length || time);

  return (
    <div className="absolute inset-0 bg-black">
      {url && (
        <video
          key={attempt}
          ref={video}
          src={url}
          poster={coverVersion !== null ? `/api/video-cover/${encodeURIComponent(slug)}?v=${coverVersion}` : undefined}
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noremoteplayback"
          className="size-full object-contain"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setLength(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            const again = resumeAt.current;
            resumeAt.current = null;
            refreshes.current = 0; // it loaded: a later expiry gets a fresh set of retries
            if (again) {
              el.currentTime = again.time;
              if (again.play) void el.play().catch(() => {});
            }
          }}
          onError={recover}
        />
      )}

      {(!url || buffering) && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-white/80" role="status">
          <Loader2 className="size-9 animate-spin" aria-label={t("loadingVideo")} />
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/80 p-4 text-center" role="alert">
          <div>
            <p className="text-sm font-semibold text-white">{t("loadFailed")}</p>
            <button
              type="button"
              onClick={() => {
                refreshes.current = 0;
                setFailed(false);
                void load();
              }}
              className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-900 hover:bg-ivory-100"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      )}

      {url && !failed && (
        <div
          dir="ltr"
          className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8 text-white"
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? t("pause") : t("resume")}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
          >
            {playing ? <Pause className="size-5 fill-current" aria-hidden /> : <Play className="size-5 fill-current" aria-hidden />}
          </button>
          <span className="w-10 shrink-0 text-xs font-semibold tabular-nums">{formatDuration(Math.floor(shown))}</span>
          <input
            type="range"
            min={0}
            max={length || 0}
            step={0.1}
            value={shown}
            aria-label={t("seek")}
            onChange={(e) => {
              const el = video.current;
              if (el) el.currentTime = Number(e.target.value);
              setTime(Number(e.target.value));
            }}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-jade-400"
          />
          <span className="w-10 shrink-0 text-end text-xs font-semibold tabular-nums text-white/70">
            {formatDuration(Math.floor(length))}
          </span>
          <button
            type="button"
            onClick={() => {
              const el = video.current;
              if (el) el.muted = !el.muted;
            }}
            aria-label={muted ? t("unmute") : t("mute")}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
          >
            {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
              {fullscreen ? <Minimize2 className="size-[18px]" aria-hidden /> : <Maximize2 className="size-[18px]" aria-hidden />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
