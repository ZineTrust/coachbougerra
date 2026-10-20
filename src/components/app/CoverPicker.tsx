"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { removeCoverAction, uploadCoverAction } from "@/actions/videos";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";

/** Crops to 16:9 and shrinks to at most 1280 px wide, as a JPEG, so phone pictures upload fast. */
async function shrinkCover(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let cropWidth = bitmap.width;
  let cropHeight = Math.round((bitmap.width * 9) / 16);
  if (cropHeight > bitmap.height) {
    cropHeight = bitmap.height;
    cropWidth = Math.round((bitmap.height * 16) / 9);
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(1280, cropWidth);
  canvas.height = Math.round((canvas.width * 9) / 16);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(
    bitmap,
    (bitmap.width - cropWidth) / 2,
    (bitmap.height - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

/** The cover image of a formation: shown in the lists and on its page. Optional. */
export function CoverPicker({ slug, coverVersion }: { slug: string; coverVersion: number | null }) {
  const t = useTranslations("space.videos");
  const err = useErrorText();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const blob = await shrinkCover(file);
        const data = new FormData();
        data.set("slug", slug);
        data.set("cover", new File([blob], "cover.jpg", { type: "image/jpeg" }));
        const result = await uploadCoverAction(initialState, data);
        if (result.ok) {
          setMessage({ tone: "success", text: t("coverSaved") });
          router.refresh();
        } else {
          setMessage({ tone: "error", text: err(result.errors?.cover ?? result.errors?.form) ?? "" });
        }
      } catch {
        setMessage({ tone: "error", text: err("invalid_image") ?? "" });
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      await removeCoverAction(slug);
      setMessage(null);
      router.refresh();
    });

  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-xl bg-ivory-100 ring-1 ring-ink-900/5">
        {coverVersion !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/video-cover/${encodeURIComponent(slug)}?v=${coverVersion}`}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center p-4 text-center text-sm text-ink-500">{t("coverNone")}</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
          <ImagePlus className="size-4" aria-hidden /> {coverVersion === null ? t("coverChoose") : t("coverChange")}
        </Button>
        {coverVersion !== null && (
          <Button variant="outline" size="sm" disabled={pending} onClick={remove}>
            <Trash2 className="size-4" aria-hidden /> {t("coverRemove")}
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
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("coverHelp")}</p>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </div>
  );
}
