"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clapperboard, Trash2, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  cancelVideoUploadAction,
  finishVideoUploadAction,
  removeVideoAction,
  signVideoPartsAction,
  startVideoUploadAction,
} from "@/actions/video-upload";
import { Button } from "@/components/ui/Button";
import { Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { UploadCancelled, uploadParts } from "@/lib/upload-parts";
import { formatBytes, videoFileType } from "@/lib/video-source";

/** What the formation plays now. */
export type CurrentVideo = { kind: "none" } | { kind: "link" } | { kind: "file"; bytes: number };

type Phase =
  | { name: "idle" }
  | { name: "preparing" }
  | { name: "sending"; sent: number; total: number }
  | { name: "finishing" };

type Message = { tone: "success" | "error" | "info"; text: string };

/** The video's length, and whether this browser can play it (read from the file itself, nothing is sent). */
function readMeta(file: File): Promise<{ seconds: number; playable: boolean }> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const address = URL.createObjectURL(file);
    const done = (value: { seconds: number; playable: boolean }) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(address);
      el.removeAttribute("src");
      el.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => done({ seconds: 0, playable: true }), 10_000);
    el.preload = "metadata";
    el.muted = true;
    el.onloadedmetadata = () =>
      done({ seconds: Number.isFinite(el.duration) ? Math.round(el.duration) : 0, playable: true });
    el.onerror = () => done({ seconds: 0, playable: false });
    el.src = address;
  });
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
}: {
  slug: string;
  current: CurrentVideo;
  /** an upload that was started and not finished */
  pending: { fileName: string; bytes: number } | null;
  storageReady: boolean;
  maxBytes: number;
}) {
  const t = useTranslations("space.videos");
  const err = useErrorText();
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [message, setMessage] = useState<Message | null>(null);
  const [removing, setRemoving] = useState(false);

  const busy = phase.name !== "idle";

  // an upload in progress must not be lost to a stray tap on "back" or a page refresh
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  // keep the screen on while sending (a sleeping phone pauses the browser)
  useEffect(() => {
    if (!busy || !("wakeLock" in navigator)) return;
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
  }, [busy]);

  const send = async (file: File) => {
    setMessage(null);
    if (file.size > maxBytes) {
      setMessage({ tone: "error", text: err("video_too_big") ?? "" });
      return;
    }
    if (!videoFileType(file.name)) {
      setMessage({ tone: "error", text: err("unsupported_video") ?? "" });
      return;
    }

    setPhase({ name: "preparing" });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const [meta, started] = await Promise.all([
        readMeta(file),
        startVideoUploadAction(slug, { name: file.name, size: file.size, lastModified: file.lastModified }),
      ]);
      if (!started.ok) {
        setMessage({ tone: "error", text: err(started.error) ?? "" });
        setPhase({ name: "idle" });
        return;
      }

      setPhase({ name: "sending", sent: 0, total: file.size });
      await uploadParts({
        file,
        partSize: started.partSize,
        partCount: started.partCount,
        done: started.done,
        urls: started.urls,
        refreshUrls: async (numbers) => {
          const fresh = await signVideoPartsAction(slug, started.uploadId, numbers);
          if (!fresh.ok) throw new Error(fresh.error);
          return fresh.urls;
        },
        onProgress: (sent) => setPhase({ name: "sending", sent, total: file.size }),
        signal: controller.signal,
      });

      setPhase({ name: "finishing" });
      const finished = await finishVideoUploadAction(slug, started.uploadId, meta.seconds);
      if (!finished.ok) {
        setMessage({ tone: "error", text: err(finished.error) ?? "" });
      } else {
        setMessage({ tone: meta.playable ? "success" : "info", text: meta.playable ? t("uploadDone") : t("uploadUnreadable") });
        router.refresh();
      }
    } catch (error) {
      if (error instanceof UploadCancelled) {
        await cancelVideoUploadAction(slug);
        setMessage(null);
      } else {
        console.error("[video-upload]", error);
        setMessage({ tone: "error", text: t("uploadStopped") });
      }
    } finally {
      abort.current = null;
      setPhase({ name: "idle" });
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

  const percent = phase.name === "sending" ? Math.min(100, Math.floor((phase.sent / phase.total) * 100)) : 0;
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
          <p className="mt-2 text-[13px] leading-snug text-ink-500">{t("uploadHelp", { max: formatBytes(maxBytes, locale) })}</p>
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

      {busy && (
        <div className="mt-4 rounded-xl bg-ivory-50 p-4 ring-1 ring-ink-900/5">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-ink-900">
            <span>
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
            aria-valuenow={phase.name === "finishing" ? 100 : percent}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-100"
          >
            <div
              className="h-full rounded-full bg-jade-500 transition-[width] duration-300"
              style={{ width: `${phase.name === "finishing" ? 100 : percent}%` }}
            />
          </div>
          <p className="mt-3 text-[13px] leading-snug text-ink-600">{t("uploadKeepOpen")}</p>
          {phase.name !== "finishing" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => abort.current?.abort()}>
              <X className="size-4" aria-hidden /> {t("uploadCancel")}
            </Button>
          )}
        </div>
      )}

      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {storageReady && (
        <details className="mt-4 text-[13px] leading-relaxed text-ink-600">
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
