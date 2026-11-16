"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Film, Link2, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { addHomeLinkAction, deleteHomeVideoAction, moveHomeVideoAction, toggleHomeVideoAction } from "@/actions/home-videos";
import { initialState } from "@/actions/types";
import { UploadProgress, useKeepAwake } from "@/components/app/VideoUploader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { uploadHomeVideo } from "@/lib/upload-home-video";
import type { UploadPhase } from "@/lib/upload-video";
import { formatBytes, type VideoProvider } from "@/lib/video-source";

export interface ManagedHomeVideo {
  id: number;
  provider: VideoProvider;
  /** a link's video id */
  ref: string;
  bytes: number | null;
  active: boolean;
  /** a file's address, to show its first image */
  previewSrc: string | null;
}

type Message = { tone: "success" | "error"; text: string };

/** The list of the home page's videos, with everything the team can do to it. */
export function HomeVideosManager({
  videos,
  storageReady,
  maxBytes,
  full,
}: {
  videos: ManagedHomeVideo[];
  storageReady: boolean;
  maxBytes: number;
  /** the list holds as many videos as it can */
  full: boolean;
}) {
  const t = useTranslations("space.homeVideos");
  const err = useErrorText();
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [working, startWork] = useTransition();
  const [linkState, linkAction, linkPending] = useActionState(addHomeLinkAction, initialState);

  const busy = phase !== null;
  useKeepAwake(busy);

  const send = async (file: File) => {
    setMessage(null);
    const controller = new AbortController();
    abort.current = controller;
    const result = await uploadHomeVideo({ file, maxBytes, signal: controller.signal, onPhase: setPhase });
    abort.current = null;
    setPhase(null);
    if (result.ok) {
      setMessage({ tone: "success", text: t("uploadDone") });
      router.refresh();
    } else if (result.error !== "cancelled") {
      setMessage({ tone: "error", text: result.error === "upload_stopped" ? t("uploadStopped") : (err(result.error) ?? "") });
    }
  };

  const run = (work: () => Promise<{ ok: boolean }>) =>
    startWork(async () => {
      const result = await work();
      if (!result.ok) setMessage({ tone: "error", text: err("unknown_video") ?? "" });
      router.refresh();
    });

  const label = (v: ManagedHomeVideo) =>
    v.provider === "file"
      ? t("kindFile", { size: formatBytes(v.bytes ?? 0, locale) })
      : v.provider === "youtube"
        ? t("kindYoutube")
        : t("kindVimeo");

  return (
    <div>
      {videos.length === 0 ? (
        <p className="rounded-xl bg-ivory-100 px-5 py-8 text-center text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {videos.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
              <div className="relative grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900 ring-1 ring-ink-900/5">
                {v.previewSrc ? (
                  <video
                    src={`${v.previewSrc}#t=0.5`}
                    muted
                    playsInline
                    preload="metadata"
                    className={`size-full object-cover ${v.active ? "" : "opacity-40"}`}
                  />
                ) : v.provider === "youtube" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://i.ytimg.com/vi/${v.ref}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className={`size-full object-cover ${v.active ? "" : "opacity-40"}`}
                  />
                ) : (
                  <Film className="size-7 text-ink-300" aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1 basis-40">
                <p className="text-[0.9375rem] font-bold text-ink-900">{t("position", { n: i + 1 })}</p>
                <p className="mt-0.5 text-sm text-ink-500">{label(v)}</p>
                <div className="mt-1.5">
                  <Badge tone={v.active ? "free" : "neutral"}>{v.active ? t("shown") : t("hidden")}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={working || i === 0}
                  onClick={() => run(() => moveHomeVideoAction(v.id, -1))}
                  aria-label={t("moveUp")}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={working || i === videos.length - 1}
                  onClick={() => run(() => moveHomeVideoAction(v.id, 1))}
                  aria-label={t("moveDown")}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button variant="outline" size="sm" disabled={working} onClick={() => run(() => toggleHomeVideoAction(v.id, !v.active))}>
                  {v.active ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  {v.active ? t("hide") : t("show")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={working}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm"))) run(() => deleteHomeVideoAction(v.id));
                  }}
                  aria-label={t("remove")}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 space-y-5 border-t border-ink-100 pt-6">
        <h3 className="font-bold text-ink-900">{t("addTitle")}</h3>

        {full && <Notice tone="info">{t("full")}</Notice>}

        {!full && (
          <>
            {storageReady ? (
              !busy && (
                <div>
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => input.current?.click()}>
                    <Upload className="size-[18px]" aria-hidden /> {t("uploadChoose")}
                  </Button>
                  <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">
                    {t("uploadHelp", { max: formatBytes(maxBytes, locale) })}
                  </p>
                </div>
              )
            ) : (
              <Notice tone="info">{t("storageOff")}</Notice>
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

            {phase && <UploadProgress phase={phase} onCancel={() => abort.current?.abort()} />}

            {!busy && (
              <form
                // rebuilt empty after a link was added, keeps what was typed after an error
                key={linkState.ok ? "added" : (linkState.values?.link ?? "")}
                action={(fd) => {
                  setMessage(null);
                  return linkAction(fd);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-start"
              >
                <div className="flex-1">
                  <Field
                    label={t("linkLabel")}
                    name="link"
                    ltr
                    placeholder="https://youtu.be/…"
                    defaultValue={linkState.values?.link}
                    error={err(linkState.errors?.link)}
                  />
                </div>
                <Button type="submit" variant="outline" size="lg" className="sm:mt-[1.625rem]" disabled={linkPending}>
                  <Link2 className="size-[18px]" aria-hidden /> {t("linkAdd")}
                </Button>
              </form>
            )}
          </>
        )}

        {linkState.errors?.form && <Notice tone="error">{err(linkState.errors.form)}</Notice>}
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <details className="text-[0.8125rem] leading-relaxed text-ink-600">
          <summary className="cursor-pointer font-semibold text-ink-700">{t("tipsTitle")}</summary>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>{t("tipShort")}</li>
            <li>{t("tipLight")}</li>
            <li>{t("tipSound")}</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
