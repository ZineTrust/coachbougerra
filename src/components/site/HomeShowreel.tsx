"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface ShowreelVideo {
  id: number;
  /** "file": our own storage (a video element); "embed": a YouTube / Vimeo player */
  kind: "file" | "embed";
  src: string;
}

/** How long a YouTube / Vimeo video stays before the next one comes (we cannot hear when it ends). */
const EMBED_SECONDS = 30;

const LESS_MOTION = "(prefers-reduced-motion: reduce)";

/** True when the visitor's device asks for less motion or for less data: nothing then starts by itself. */
function subscribeCalm(onChange: () => void) {
  const query = window.matchMedia(LESS_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readCalm = () =>
  window.matchMedia(LESS_MOTION).matches ||
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/**
 * The videos at the top of the home page. Only the one on screen is loaded: it starts by itself, silent
 * (phones do not allow anything else), and the next one follows when it ends. A visitor can pick another
 * one, turn the sound on, or just scroll past. Nothing starts by itself for people who asked their device
 * for less motion or for less data.
 */
export function HomeShowreel({ items }: { items: ShowreelVideo[] }) {
  const t = useTranslations("showreel");
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const [muted, setMuted] = useState(true);
  const calm = useSyncExternalStore(subscribeCalm, readCalm, () => false);
  const [started, setStarted] = useState(false); // a tap on "play" when playback had to wait for one
  const [blocked, setBlocked] = useState(false); // the browser refused to start the video by itself
  const [touched, setTouched] = useState(false); // someone used an embedded player: stop turning pages
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const usable = items.filter((v) => !failed.includes(v.id));
  const current = usable[Math.min(index, usable.length - 1)];
  const many = usable.length > 1;
  const waiting = calm && !started;

  const go = useCallback(
    (to: number) => {
      setBlocked(false);
      setIndex(((to % usable.length) + usable.length) % usable.length);
    },
    [usable.length],
  );

  // a YouTube / Vimeo video cannot tell us it ended: turn the page after a while (unless someone is using it)
  useEffect(() => {
    if (!current || current.kind !== "embed" || !many || touched || waiting) return;
    const timer = setTimeout(() => go(index + 1), EMBED_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [current, many, touched, waiting, index, go]);

  // clicking inside an embedded player moves the focus into it
  useEffect(() => {
    const onBlur = () => {
      if (box.current && document.activeElement instanceof HTMLIFrameElement && box.current.contains(document.activeElement)) {
        setTouched(true);
      }
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // a video nobody sees does not need to run (saves the battery and the data)
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const v = video.current;
        if (!v) return;
        if (entry.isIntersecting) {
          if (!waiting) void v.play().catch(() => setBlocked(true));
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [current?.id, waiting]);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted, current?.id]);

  if (!current) return null;

  const play = () => {
    setStarted(true);
    setBlocked(false);
    void video.current?.play().catch(() => undefined);
  };

  const showPlay = waiting || (blocked && current.kind === "file");

  return (
    <section aria-label={t("label")} className="bg-ink-950">
      <div className="mx-auto max-w-4xl px-5 pb-2 pt-5 sm:px-8 sm:pt-8">
        <div
          ref={box}
          className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-stage ring-1 ring-white/10 sm:rounded-3xl"
        >
          {current.kind === "file" && !waiting && (
            <video
              key={current.id}
              ref={video}
              src={current.src}
              autoPlay
              muted
              playsInline
              loop={!many}
              preload="auto"
              disablePictureInPicture
              onEnded={() => many && go(index + 1)}
              onError={() => {
                setFailed((f) => [...f, current.id]);
                setIndex(0);
              }}
              onPlaying={() => setBlocked(false)}
              className="size-full object-cover"
            />
          )}
          {current.kind === "embed" && (!waiting || started) && (
            <iframe
              key={current.id}
              src={current.src}
              title={t("label")}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 size-full border-0"
            />
          )}

          {showPlay && (
            <button
              type="button"
              onClick={play}
              aria-label={t("play")}
              className="absolute inset-0 grid place-items-center bg-ink-950/50 text-white transition-colors hover:bg-ink-950/35"
            >
              <span className="grid size-16 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur">
                <Play className="size-7 fill-current" aria-hidden />
              </span>
            </button>
          )}

          {current.kind === "file" && !showPlay && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? t("soundOn") : t("soundOff")}
              className="absolute bottom-3 end-3 grid size-10 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/75"
            >
              {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
            </button>
          )}

          {many && (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label={t("previous")}
                className="absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:grid"
              >
                <ChevronLeft className="flip-rtl size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label={t("next")}
                className="absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/70 sm:grid"
              >
                <ChevronRight className="flip-rtl size-5" aria-hidden />
              </button>
            </>
          )}
        </div>

        {many && (
          <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label={t("label")}>
            {usable.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t("goTo", { n: i + 1 })}
                aria-current={v.id === current.id}
                className={cn(
                  "h-2 rounded-full transition-all",
                  v.id === current.id ? "w-7 bg-gold-400" : "w-2 bg-white/30 hover:bg-white/55",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
