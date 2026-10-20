"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { saveVideoAction } from "@/actions/videos";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { CheckRow, Field, Notice, Segmented, Select, TextArea, useErrorText } from "@/components/ui/form";
import { VIDEO_CATEGORIES } from "@/lib/data";
import { MAX_PV } from "@/lib/unlock";

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
 * title is needed: the other language shows the one that was written). Creating sends the team to
 * the formation's own page, where the cover image and a preview of the video are.
 */
export function VideoForm({ initial }: { initial: VideoFormInitial | null }) {
  const t = useTranslations("space.videos");
  const cat = useTranslations("categories");
  const err = useErrorText();
  const [state, action, pending] = useActionState(saveVideoAction, initialState);
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");

  // after an error the form keeps what was typed; otherwise it shows the saved formation
  const v = (key: keyof VideoFormInitial) => state.values?.[key] ?? initial?.[key] ?? "";
  const errors = state.errors ?? {};
  const alreadyPublished = initial?.status === "published";

  return (
    <form action={action} className="space-y-5">
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
      <p className="-mt-2 text-[13px] leading-snug text-ink-500">{t("titleHelp")}</p>

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

      {/* the video is normally sent from the phone (see VideoUploader); a link is the alternative */}
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
        <p className="text-[13px] leading-snug text-ink-500">{t("statusHelp")}</p>
        {status === "published" && !alreadyPublished && (
          <CheckRow
            name="notify"
            value="on"
            label={t("notifyLabel")}
            help={t("notifyHelp")}
            defaultChecked={state.values?.notify === "on"}
          />
        )}
      </div>

      {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
      {state.ok && initial && <Notice tone="success">{t("saved")}</Notice>}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {initial ? (
          t("save")
        ) : (
          <>
            <Plus className="size-[18px]" aria-hidden /> {t("create")}
          </>
        )}
      </Button>
    </form>
  );
}
