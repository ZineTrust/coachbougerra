"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/actions/profile";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, useErrorText } from "@/components/ui/form";
import { MemberAvatar } from "@/components/ui/Avatar";
import { useRouter } from "@/i18n/navigation";

/** Square-crops and shrinks a photo to a small JPEG so phone pictures upload fast. */
async function shrinkToJpeg(file: File, size = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

function PhotoUploader({
  code,
  name,
  photoVersion,
}: {
  code: number;
  name: string;
  photoVersion: number | null;
}) {
  const t = useTranslations("profile");
  const err = useErrorText();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const blob = await shrinkToJpeg(file);
        const data = new FormData();
        data.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const result = await uploadAvatarAction(initialState, data);
        if (result.ok) {
          setMessage({ tone: "success", text: t("photoSaved") });
          router.refresh();
        } else {
          setMessage({ tone: "error", text: err(result.errors?.photo ?? result.errors?.form) ?? "" });
        }
      } catch {
        setMessage({ tone: "error", text: err("invalid_image") ?? "" });
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      await removeAvatarAction();
      setMessage(null);
      router.refresh();
    });

  return (
    <div>
      <p className="text-sm font-semibold text-ink-700">{t("photo")}</p>
      <div className="mt-2 flex items-center gap-4">
        <MemberAvatar
          code={code}
          name={name}
          photoVersion={photoVersion}
          className="size-20 text-2xl ring-2 ring-white shadow-card"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            <Camera className="size-4" aria-hidden />
            {photoVersion === null ? t("choosePhoto") : t("changePhoto")}
          </Button>
          {photoVersion !== null && (
            <Button variant="outline" size="sm" disabled={pending} onClick={remove}>
              <Trash2 className="size-4" aria-hidden /> {t("removePhoto")}
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // allow choosing the same file again
          }}
        />
      </div>
      <p className="mt-2 text-[13px] text-ink-500">{t("photoHint")}</p>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </div>
  );
}

export function ProfileForm({
  code,
  fullName,
  city,
  showInRanking,
  photoVersion,
}: {
  code: number;
  fullName: string | null;
  city: string | null;
  showInRanking: boolean;
  photoVersion: number | null;
}) {
  const t = useTranslations("profile");
  const err = useErrorText();
  const [state, action, pending] = useActionState(updateProfileAction, initialState);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <div className="space-y-6">
      <PhotoUploader code={code} name={fullName ?? String(code)} photoVersion={photoVersion} />

      <form key={state.errors ? JSON.stringify(values) : "form"} action={action} className="space-y-4">
        {state.ok && <Notice tone="success">{t("saved")}</Notice>}
        {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
        <Field
          label={t("name")}
          name="fullName"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          defaultValue={values.fullName ?? fullName ?? ""}
          error={err(errors.fullName)}
          maxLength={80}
        />
        <Field
          label={t("city")}
          name="city"
          autoComplete="address-level2"
          placeholder={t("cityPlaceholder")}
          defaultValue={values.city ?? city ?? ""}
          error={err(errors.city)}
          maxLength={60}
        />
        <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-ink-200 has-[:checked]:bg-jade-50 has-[:checked]:ring-jade-400">
          <input
            type="checkbox"
            name="showInRanking"
            defaultChecked={showInRanking}
            className="mt-1 size-4 shrink-0 accent-jade-600"
          />
          <span>
            <span className="block text-sm font-semibold text-ink-900">{t("ranking")}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{t("rankingHelp")}</span>
          </span>
        </label>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
