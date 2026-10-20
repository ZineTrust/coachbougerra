"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clapperboard, Trash2, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { removeVideoAction } from "@/actions/video-upload";
import { Button } from "@/components/ui/Button";
import { Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { checkVideoFile, uploadVideoFile, type UploadPhase } from "@/lib/upload-video";
import { formatBytes } from "@/lib/video-source";

/** What the formation plays now. */
export type CurrentVideo = { kind: "none" } | { kind: "link" } | { kind: "file"; bytes: number };

type Message = { tone: "success" | "error" | "info"; text: string };

/** Keeps the page from being left by accident, and the phone's screen on, while a video is being sent. */
export function useKeepAwake(active: boolean) {
  // a stray tap on "back" or a refresh must not throw an upload away
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  // a sleeping phone pauses the browser
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const ask = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (stopped) void lock.release();
      } catch {
        // refused (low battery, unsupported): the hint on screen asks to keep the screen on
      }
    };
    const again = () => {
      if (document.visibilityState === "visible") void ask();
    };
    void ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", again);
      void lock?.release();
    };
  }, [active]);
}

/** The progress bar, the "keep this page open" hint and the cancel button of a send in progress. */
export function UploadProgress({ phase, onCancel }: { phase: UploadPhase; onCancel?: () => void }) {
  const t = useTranslations("space.videos");
  const locale = useLocale();
  const percent = phase.name === "sending" ? Math.min(100, Math.floor((phase.sent / phase.total) * 100)) : 0;
  const shown = phase.name === "finishing" ? 100 : percent;

  return (
    <div className="rounded-xl bg-ivory-50 p-4 ring-1 ring-ink-900/5">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink-900">
        <span>
          {phase.name === "creating" && t("creating")}
          {phase.name === "preparing" && t("uploadPreparing")}
          {phase.name === "sending" && t("uploadProgress", { percent })}
          {phase.name === "finishing" && t("uploadFinishing")}
        </span>
        {phase.name === "sending" && (
          <span dir="ltr" className="text-xs font-medium text-ink-500">
            {formatBytes(phase.sent, locale)} / {formatBytes(phase.total, locale)}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-100"
      >
        <div className="h-full rounded-full bg-jade-500 transition-[width] duration-300" style={{ width: `${shown}%` }} />
      </div>
      <p className="mt-3 text-[0.8125rem] leading-snug text-ink-600">{t("uploadKeepOpen")}</p>
      {onCancel && (phase.name === "preparing" || phase.name === "sending") && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onCancel}>
          <X className="size-4" aria-hidden /> {t("uploadCancel")}
        </Button>
      )}
    </div>
  );
}

/**
 * Send the formation's video from the phone: pick it in the gallery (or film it), and it goes straight
 * to the storage in pieces, with a progress bar. The page must stay open; if the connection drops the
 * pieces already sent are kept, and picking the same file again carries on from there.
 */
export function VideoUploader({
  slug,
  current,
  pending,
  storageReady,
  maxBytes,
  notice = null,
}: {
  slug: string;
  current: CurrentVideo;
  /** an upload that was started and not finished */
  pending: { fileName: string; bytes: number } | null;
  storageReady: boolean;
  maxBytes: number;
  /** a message to show on arrival (the new-formation form sends people here when its upload stopped) */
  notice?: Message | null;
}) {
  const t = useTranslations("space.videos");
  const err = useErrorText();
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [message, setMessage] = useState<Message | null>(notice);
  const [removing, setRemoving] = useState(false);

  const busy = phase !== null;
  useKeepAwake(busy);

  const send = async (file: File) => {
    setMessage(null);
    const problem = checkVideoFile(file, maxBytes);
    if (problem) {
      setMessage({ tone: "error", text: err(problem) ?? "" });
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const result = await uploadVideoFile({ slug, file, maxBytes, signal: controller.signal, onPhase: setPhase });
    abort.current = null;
    setPhase(null);
    if (result.ok) {
      setMessage({
        tone: result.playable ? "success" : "info",
        text: result.playable ? t("uploadDone") : t("uploadUnreadable"),
      });
      router.refresh();
    } else if (result.error === "cancelled") {
      setMessage(null);
    } else {
      setMessage({ tone: "error", text: result.error === "upload_stopped" ? t("uploadStopped") : (err(result.error) ?? "") });
    }
  };

  const remove = async () => {
    if (!window.confirm(t("removeVideoConfirm"))) return;
    setRemoving(true);
    const result = await removeVideoAction(slug);
    setRemoving(false);
    if (result.ok) {
      setMessage(null);
      router.refresh();
    } else {
      setMessage({ tone: "error", text: err(result.error) ?? "" });
    }
  };

  const hasVideo = current.kind !== "none";

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        {current.kind === "none" ? (
          <>
            <Clapperboard className="size-[18px] text-gold-600" aria-hidden /> {t("videoNone")}
          </>
        ) : (
          <>
            <CheckCircle2 className="size-[18px] text-jade-600" aria-hidden />
            {current.kind === "file"
              ? t("videoFile", { size: formatBytes(current.bytes, locale) })
              : t("videoLink")}
          </>
        )}
      </p>

      {!storageReady && (
        <div className="mt-3">
          <Notice tone="info">{t("storageOff")}</Notice>
        </div>
      )}

      {storageReady && !busy && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => input.current?.click()}>
              <Upload className="size-[18px]" aria-hidden /> {hasVideo ? t("uploadReplace") : t("uploadChoose")}
            </Button>
            {hasVideo && (
              <Button variant="outline" size="lg" className="w-full sm:w-auto" disabled={removing} onClick={remove}>
                <Trash2 className="size-[18px]" aria-hidden /> {t("removeVideo")}
              </Button>
            )}
          </div>
          <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("uploadHelp", { max: formatBytes(maxBytes, locale) })}</p>
          {pending && !message && (
            <div className="mt-3">
              <Notice tone="info">
                {t("uploadResume", { name: pending.fileName, size: formatBytes(pending.bytes, locale) })}
              </Notice>
            </div>
          )}
        </>
      )}

      <input
        ref={input}
        type="file"
        accept="video/*,.mp4,.m4v,.mov,.webm"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void send(file);
        }}
      />

      {phase && (
        <div className="mt-4">
          <UploadProgress phase={phase} onCancel={() => abort.current?.abort()} />
        </div>
      )}

      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {storageReady && (
        <details className="mt-4 text-[0.8125rem] leading-relaxed text-ink-600">
          <summary className="cursor-pointer font-semibold text-ink-700">{t("tipsTitle")}</summary>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>{t("tipWifi")}</li>
            <li>{t("tipQuality")}</li>
            <li>{t("tipIphone")}</li>
          </ul>
        </details>
      )}
    </div>
  );
}
