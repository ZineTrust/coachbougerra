"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { saveVideoAction } from "@/actions/videos";
import { initialState, type FormState } from "@/actions/types";
import { UploadProgress, useKeepAwake } from "@/components/app/VideoUploader";
import { Button } from "@/components/ui/Button";
import { CheckRow, Field, Notice, Segmented, Select, TextArea, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { VIDEO_CATEGORIES } from "@/lib/data";
import { MAX_PV } from "@/lib/unlock";
import { checkVideoFile, uploadVideoFile, type UploadPhase } from "@/lib/upload-video";
import { formatBytes } from "@/lib/video-source";

/** What the form starts with when changing an existing formation. */
export interface VideoFormInitial {
  slug: string;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  category: string;
  minutes: string;
  pv: string;
  link: string;
  status: "draft" | "published";
}

/**
 * Create or change a formation. Title and description exist in French and Arabic (at least one
 * title is needed: the other language shows the one that was written).
 *
 * Creating: the video can be picked right here, in the phone's gallery. One tap then creates the
 * formation and sends the video, and the team lands on the formation's page (cover image, preview).
 * Without a picked video, creating just opens that page, where a video can be sent later.
 */
export function VideoForm({
  initial,
  storageReady = false,
  maxBytes = 0,
}: {
  initial: VideoFormInitial | null;
  /** the video storage is set up, so a video can be picked while creating */
  storageReady?: boolean;
  maxBytes?: number;
}) {
  const t = useTranslations("space.videos");
  const cat = useTranslations("categories");
  const err = useErrorText();
  const locale = useLocale();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveVideoAction, initialState);
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");

  // creating with a video goes through this component instead of the plain form action
  const [file, setFile] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [local, setLocal] = useState<FormState | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const busy = phase !== null;
  useKeepAwake(busy);

  // after an error the form keeps what was typed; otherwise it shows the saved formation
  const current = local ?? state;
  const v = (key: keyof VideoFormInitial) => current.values?.[key] ?? initial?.[key] ?? "";
  const errors = current.errors ?? {};
  const alreadyPublished = initial?.status === "published";

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const problem = checkVideoFile(picked, maxBytes);
    setPickError(problem);
    setFile(problem ? null : picked);
  };

  /** Create the formation (staying on this page), send the video, then go to the formation's page. */
  const createAndSend = async (form: HTMLFormElement, video: File) => {
    const data = new FormData(form);
    data.set("stay", "1");
    setPhase({ name: "creating" });
    const created = await saveVideoAction(initialState, data);
    const slug = created.info?.slug;
    if (!created.ok || typeof slug !== "string") {
      setLocal(created);
      setPhase(null);
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    const result = await uploadVideoFile({ slug, file: video, maxBytes, signal: controller.signal, onPhase: setPhase });
    abort.current = null;
    // the formation exists either way: its page shows the result and lets a stopped send be resumed
    const query = result.ok ? "?cree=video" : result.error === "cancelled" ? "?cree=1" : `?cree=1&envoi=${encodeURIComponent(result.error)}`;
    router.push(`/espace/videos/${slug}${query}`);
  };

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={(e) => {
        setLocal(null);
        if (initial || !file) return; // plain save / create: the form action does it
        e.preventDefault();
        if (!busy) void createAndSend(e.currentTarget, file);
      }}
    >
      {initial && <input type="hidden" name="slug" value={initial.slug} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("fieldTitleFr")}
          name="titleFr"
          maxLength={120}
          defaultValue={v("titleFr")}
          placeholder={t("titleFrPlaceholder")}
          error={err(errors.titleFr)}
        />
        <Field
          label={t("fieldTitleAr")}
          name="titleAr"
          dir="rtl"
          maxLength={120}
          defaultValue={v("titleAr")}
          error={err(errors.titleAr)}
        />
      </div>
      <p className="-mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("titleHelp")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea
          label={t("fieldDescriptionFr")}
          name="descriptionFr"
          maxLength={2000}
          defaultValue={v("descriptionFr")}
          placeholder={t("descriptionPlaceholder")}
          error={err(errors.descriptionFr)}
        />
        <TextArea
          label={t("fieldDescriptionAr")}
          name="descriptionAr"
          dir="rtl"
          maxLength={2000}
          defaultValue={v("descriptionAr")}
          error={err(errors.descriptionAr)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select label={t("fieldCategory")} name="category" defaultValue={v("category") || VIDEO_CATEGORIES[0]} error={err(errors.category)}>
          {VIDEO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {cat(c)}
            </option>
          ))}
        </Select>
        <Field
          label={t("fieldMinutes")}
          hint={t("minutesHint")}
          name="minutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          step={1}
          ltr
          defaultValue={v("minutes")}
          placeholder="45"
          error={err(errors.minutes)}
        />
        <Field
          label={t("fieldPv")}
          hint={t("pvHint")}
          name="pv"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_PV}
          step={1}
          ltr
          defaultValue={v("pv") || "0"}
          error={err(errors.pv)}
        />
      </div>

      {/* a new formation: the video is picked here, in the gallery (an existing one has its own card for that) */}
      {!initial && (
        <div className="rounded-xl bg-ivory-50 p-4 ring-1 ring-ink-900/5">
          <p className="text-sm font-bold text-ink-900">{t("videoTitle")}</p>
          {storageReady ? (
            <>
              {file && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-ink-900/10">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink-900" dir="auto">
                    {file.name} <span className="font-normal text-ink-500">({formatBytes(file.size, locale)})</span>
                  </span>
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label={t("videoUnpick")}
                      title={t("videoUnpick")}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ivory-100 hover:text-ink-900"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant={file ? "outline" : "primary"}
                size="lg"
                disabled={busy}
                className="mt-3 w-full sm:w-auto"
                onClick={() => input.current?.click()}
              >
                <Upload className="size-[18px]" aria-hidden /> {file ? t("videoChange") : t("videoPick")}
              </Button>
              <input
                ref={input}
                type="file"
                accept="video/*,.mp4,.m4v,.mov,.webm"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("uploadHelp", { max: formatBytes(maxBytes, locale) })}</p>
              {pickError && (
                <div className="mt-3">
                  <Notice tone="error">{err(pickError)}</Notice>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3">
              <Notice tone="info">{t("storageOff")}</Notice>
            </div>
          )}
        </div>
      )}

      {/* the other way: a YouTube / Vimeo link */}
      <details className="rounded-xl bg-ivory-50 px-4 py-3 ring-1 ring-ink-900/5" open={Boolean(v("link")) || undefined}>
        <summary className="cursor-pointer text-sm font-semibold text-ink-700">{t("linkInstead")}</summary>
        <div className="mt-3">
          <Field
            label={t("fieldLink")}
            hint={t("linkHint")}
            name="link"
            type="text"
            inputMode="url"
            autoComplete="off"
            maxLength={300}
            ltr
            defaultValue={v("link")}
            placeholder={t("linkPlaceholder")}
            error={err(errors.link)}
          />
        </div>
      </details>

      <div className="space-y-3">
        <Segmented
          label={t("fieldStatus")}
          name="status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "draft", label: t("statusDraft") },
            { value: "published", label: t("statusPublished") },
          ]}
        />
        <p className="text-[0.8125rem] leading-snug text-ink-500">{t("statusHelp")}</p>
        {status === "published" && !alreadyPublished && (
          <CheckRow
            name="notify"
            value="on"
            label={t("notifyLabel")}
            help={t("notifyHelp")}
            defaultChecked={current.values?.notify === "on"}
          />
        )}
      </div>

      {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
      {current.ok && initial && <Notice tone="success">{t("saved")}</Notice>}

      {phase && <UploadProgress phase={phase} onCancel={() => abort.current?.abort()} />}
      {!initial && file && !busy && <p className="text-[0.8125rem] leading-snug text-ink-500">{t("createNext")}</p>}

      {/* on a phone the button stays at the bottom of the screen while the form is long, so it is never lost below the fold */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 rounded-b-2xl border-t border-ink-100 bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" disabled={pending || busy} className="w-full sm:w-auto">
          {initial ? (
            t("save")
          ) : (
            <>
              <Plus className="size-[18px]" aria-hidden /> {file ? t("createAndSend") : t("create")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
