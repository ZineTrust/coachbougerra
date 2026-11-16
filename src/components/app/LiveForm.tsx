"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveLiveAction } from "@/actions/lives";
import { initialState, type FormState } from "@/actions/types";
import { ImageField } from "@/components/app/ImageField";
import { Button } from "@/components/ui/Button";
import { CheckRow, Field, Notice, Segmented, Select, TextArea, useErrorText } from "@/components/ui/form";
import type { LiveAccess } from "@/lib/data";
import { Modal } from "./Modal";

/** What the form starts with when changing an existing live. */
export interface LiveFormInitial {
  id: string;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  host: string;
  access: LiveAccess;
  /** Algiers wall time, "2026-11-20T21:00" */
  start: string;
  length: number;
  replaySlug: string;
  /** the version of the saved picture, null when there is none */
  coverVersion: number | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
}

export interface VideoChoice {
  slug: string;
  title: string;
}

const LENGTHS = [30, 45, 60, 75, 90, 120, 180];

/** Plan a new live (initial = null) or change one. The modal holds nothing between two openings. */
export function LiveFormModal({
  open,
  onClose,
  initial,
  defaultStart,
  videos,
}: {
  open: boolean;
  onClose: () => void;
  initial: LiveFormInitial | null;
  /** the suggested start of a new live, "2026-11-20T21:00" in Algiers time */
  defaultStart: string;
  videos: VideoChoice[];
}) {
  const t = useTranslations("space.modals");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? t("editTitle") : t("scheduleTitle")}
      description={initial ? t("editDescription") : t("scheduleDescription")}
    >
      {open && <LiveForm key={initial?.id ?? "new"} initial={initial} defaultStart={defaultStart} videos={videos} onDone={onClose} />}
    </Modal>
  );
}

function LiveForm({
  initial,
  defaultStart,
  videos,
  onDone,
}: {
  initial: LiveFormInitial | null;
  defaultStart: string;
  videos: VideoChoice[];
  onDone: () => void;
}) {
  const t = useTranslations("space.modals");
  const c = useTranslations("common");
  const err = useErrorText();
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveLiveAction(prev, fd);
    if (result.ok) onDone();
    return result;
  }, initialState);

  const [access, setAccess] = useState<LiveAccess>(
    (state.values?.access as LiveAccess | undefined) ?? initial?.access ?? "free",
  );
  const start = initial?.start ?? defaultStart;
  const v = (key: string, fallback: string) => state.values?.[key] ?? fallback;
  const errors = state.errors ?? {};
  const length = Number(v("length", String(initial?.length ?? 60)));
  const lengths = LENGTHS.includes(length) ? LENGTHS : [...LENGTHS, length].sort((a, b) => a - b);

  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("fieldTitleFr")}
          name="titleFr"
          maxLength={120}
          defaultValue={v("titleFr", initial?.titleFr ?? "")}
          placeholder={t("fieldLiveTitlePlaceholder")}
          error={err(errors.titleFr)}
        />
        <Field
          label={t("fieldTitleAr")}
          name="titleAr"
          dir="rtl"
          maxLength={120}
          defaultValue={v("titleAr", initial?.titleAr ?? "")}
          error={err(errors.titleAr)}
        />
      </div>
      <p className="-mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("titleHelp")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea
          label={t("fieldDescriptionFr")}
          name="descriptionFr"
          maxLength={1000}
          className="min-h-20"
          defaultValue={v("descriptionFr", initial?.descriptionFr ?? "")}
          error={err(errors.descriptionFr)}
        />
        <TextArea
          label={t("fieldDescriptionAr")}
          name="descriptionAr"
          dir="rtl"
          maxLength={1000}
          className="min-h-20"
          defaultValue={v("descriptionAr", initial?.descriptionAr ?? "")}
          error={err(errors.descriptionAr)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t("fieldDate")}
          name="date"
          type="date"
          ltr
          required
          defaultValue={v("date", start.slice(0, 10))}
          error={err(errors.date)}
        />
        <Field
          label={t("fieldTime")}
          name="time"
          type="time"
          ltr
          required
          defaultValue={v("time", start.slice(11, 16))}
        />
        <Select label={t("fieldLength")} name="length" defaultValue={String(length)} error={err(errors.length)}>
          {lengths.map((m) => (
            <option key={m} value={m}>
              {t("minutes", { count: m })}
            </option>
          ))}
        </Select>
      </div>

      <ImageField
        name="image"
        removeName="removeImage"
        aspect={16 / 9}
        label={t("fieldImage")}
        hint={t("imageHint")}
        error={err(errors.image)}
        currentSrc={initial?.coverVersion != null ? `/api/live-cover/${initial.id}?v=${initial.coverVersion}` : null}
      />

      <Field
        label={t("fieldHost")}
        name="host"
        maxLength={80}
        defaultValue={v("host", initial?.host ?? "Coach Bouguerra")}
        error={err(errors.host)}
      />

      <Segmented
        label={t("fieldAccess")}
        name="access"
        value={access}
        onChange={setAccess}
        options={[
          { value: "free", label: c("free") },
          { value: "premium", label: c("reserved") },
          { value: "team", label: c("team") },
        ]}
      />
      <p className="-mt-2 text-sm leading-relaxed text-ink-500">
        {access === "premium" ? t("reservedLiveHelp") : access === "team" ? t("teamLiveHelp") : t("freeLiveHelp")}
      </p>

      {initial && videos.length > 0 && (
        <Select
          label={t("fieldReplay")}
          hint={t("replayHint")}
          name="replaySlug"
          defaultValue={v("replaySlug", initial.replaySlug)}
          error={err(errors.replaySlug)}
        >
          <option value="">{t("noReplay")}</option>
          {videos.map((video) => (
            <option key={video.slug} value={video.slug}>
              {video.title}
            </option>
          ))}
        </Select>
      )}

      {!initial && access === "free" && (
        <CheckRow
          name="notify"
          value="on"
          label={t("notifyNew")}
          help={t("notifyNewHelp")}
          defaultChecked={state.values?.notify === "on"}
        />
      )}

      {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onDone}>
          {c("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {initial ? c("save") : t("scheduleSubmit")}
        </Button>
      </div>
    </form>
  );
}
