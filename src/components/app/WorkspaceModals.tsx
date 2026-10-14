"use client";

import { useState } from "react";
import { FileVideo, Radio, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field, Segmented, Select, TextArea } from "@/components/ui/form";
import { VIDEO_CATEGORIES } from "@/lib/data";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

/*
  Publishing formations and planning lives are still demonstrations: the forms
  look and behave like the real thing, but nothing is saved yet. (Members,
  notifications and staff accounts, on the other hand, are fully real.)
*/

type ModalProps = { open: boolean; onClose: () => void };

function Actions({ onCancel, submit }: { onCancel: () => void; submit: string }) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={onCancel}>
        {t("cancel")}
      </Button>
      <Button type="submit">{submit}</Button>
    </div>
  );
}

export function PublishVideoModal({ open, onClose }: ModalProps) {
  const t = useTranslations("space.modals");
  const cat = useTranslations("categories");
  const notify = useToast();
  const [access, setAccess] = useState<"free" | "pv">("free");
  const [fileName, setFileName] = useState<string | null>(null);

  const close = () => {
    setAccess("free");
    setFileName(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("publishTitle")}
      description={t("publishDescription")}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const title = String(new FormData(e.currentTarget).get("title") ?? "");
          notify(t("demoSaved", { title }));
          close();
        }}
      >
        <Field label={t("fieldTitle")} name="title" placeholder={t("fieldTitlePlaceholder")} required />
        <TextArea
          label={t("fieldDescription")}
          name="description"
          placeholder={t("fieldDescriptionPlaceholder")}
        />
        <Select label={t("fieldCategory")} name="category" defaultValue={VIDEO_CATEGORIES[0]}>
          {VIDEO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {cat(c)}
            </option>
          ))}
        </Select>

        <Segmented
          label={t("fieldAccess")}
          value={access}
          onChange={setAccess}
          options={[
            { value: "free", label: t("accessFree") },
            { value: "pv", label: t("accessPv") },
          ]}
        />
        {access === "pv" && (
          <Field
            label={t("fieldPv")}
            hint={t("fieldPvHint")}
            name="pv"
            type="number"
            ltr
            min={1}
            step={1}
            placeholder="200"
            required
          />
        )}

        <div>
          <span className="text-sm font-semibold text-ink-700">{t("fieldFile")}</span>
          <label className="mt-1.5 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ivory-50 px-4 py-8 text-center transition-colors hover:border-jade-400 hover:bg-jade-50/50">
            {fileName ? (
              <FileVideo className="size-8 text-jade-600" aria-hidden />
            ) : (
              <Upload className="size-8 text-ink-400" aria-hidden />
            )}
            <span dir="auto" className="text-sm font-semibold text-ink-700">
              {fileName ?? t("chooseFile")}
            </span>
            {!fileName && <span className="text-xs text-ink-500">{t("fileTypes")}</span>}
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </div>

        <Actions onCancel={close} submit={t("publishSubmit")} />
      </form>
    </Modal>
  );
}

export function ScheduleLiveModal({ open, onClose }: ModalProps) {
  const t = useTranslations("space.modals");
  const c = useTranslations("common");
  const notify = useToast();
  const [access, setAccess] = useState<"free" | "premium" | "team">("free");

  const close = () => {
    setAccess("free");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("scheduleTitle")}
      description={t("scheduleDescription")}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const title = String(new FormData(e.currentTarget).get("title") ?? "");
          notify(t("demoSaved", { title }));
          close();
        }}
      >
        <Field
          label={t("fieldLiveTitle")}
          name="title"
          placeholder={t("fieldLiveTitlePlaceholder")}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fieldDate")} name="date" type="date" ltr required />
          <Field label={t("fieldTime")} name="time" type="time" ltr defaultValue="20:30" required />
        </div>
        <Select label={t("fieldLength")} name="length" defaultValue="60">
          {[30, 45, 60, 75, 90, 120].map((m) => (
            <option key={m} value={m}>
              {t("minutes", { count: m })}
            </option>
          ))}
        </Select>

        <Segmented
          label={t("fieldAccess")}
          value={access}
          onChange={setAccess}
          options={[
            { value: "free", label: c("free") },
            { value: "premium", label: c("reserved") },
            { value: "team", label: c("team") },
          ]}
        />
        {access === "premium" && <p className="text-sm leading-relaxed text-ink-500">{t("reservedLiveHelp")}</p>}

        <Actions onCancel={close} submit={t("scheduleSubmit")} />
      </form>
    </Modal>
  );
}

export function ComingSoonModal({
  open,
  onClose,
  title,
}: ModalProps & { title: string }) {
  const t = useTranslations("space.modals");
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-jade-50 text-jade-600">
          <Radio className="size-8" aria-hidden />
        </span>
        <p className="mt-5 text-lg font-bold">{t("comingTitle")}</p>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-500">
          {t("comingText")}
        </p>
        <Button className="mt-7" onClick={onClose}>
          {t("understood")}
        </Button>
      </div>
    </Modal>
  );
}
