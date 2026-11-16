"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Shrinks a picture picked on a phone before it is sent (phone photos are several MB): a JPEG of at most
 * 1280 px wide when it is cropped to `aspect` (width / height), else at most 1280 px on its long side (the
 * same limit the server applies).
 */
async function shrinkImage(file: File, aspect?: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (aspect) {
    if (sw / sh > aspect) {
      sw = Math.round(sh * aspect);
      sx = Math.round((bitmap.width - sw) / 2);
    } else {
      sh = Math.round(sw / aspect);
      sy = Math.round((bitmap.height - sh) / 2);
    }
  }
  const scale = Math.min(1, 1280 / (aspect ? sw : Math.max(sw, sh)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

/**
 * An optional picture inside a form. The picked file is shrunk in the browser and put in a hidden file field
 * called `name`, so it travels with the rest of the form. When a picture is already there (`currentSrc`) it can
 * be removed: the field `removeName` is then sent with the value "1".
 */
export function ImageField({
  name,
  removeName,
  label,
  hint,
  error,
  aspect,
  currentSrc,
}: {
  name: string;
  removeName?: string;
  label: string;
  hint?: string;
  error?: string;
  /** width / height to crop to (16 / 9 for the picture of a live); free when omitted */
  aspect?: number;
  /** the picture that is already saved, if any */
  currentSrc?: string | null;
}) {
  const t = useTranslations("space.image");
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);

  // free the temporary address of a preview when it is replaced or the field goes away
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const shown = preview ?? (removed ? null : (currentSrc ?? null));

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem(false);
    try {
      const blob = await shrinkImage(file, aspect);
      const data = new DataTransfer();
      data.items.add(new File([blob], "picture.jpg", { type: "image/jpeg" }));
      if (input.current) input.current.files = data.files;
      setPreview(URL.createObjectURL(blob));
      setRemoved(false);
    } catch {
      setProblem(true);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    if (input.current) input.current.value = "";
    setPreview(null);
    setRemoved(true);
    setProblem(false);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <div
        className={cn(
          "mt-1.5 overflow-hidden rounded-xl bg-ivory-100 ring-1 ring-ink-900/5",
          shown ? "" : "grid place-items-center p-5 text-center",
          shown && aspect ? "aspect-video" : "",
        )}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className={cn("w-full", aspect ? "size-full object-cover" : "max-h-64 object-contain")} />
        ) : (
          <p className="text-sm text-ink-500">{t("none")}</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <ImagePlus className="size-4" aria-hidden /> {busy ? t("processing") : shown ? t("change") : t("choose")}
        </Button>
        {shown && (
          <Button variant="outline" size="sm" disabled={busy} onClick={clear}>
            <Trash2 className="size-4" aria-hidden /> {t("remove")}
          </Button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {removeName && removed && !preview && <input type="hidden" name={removeName} value="1" />}

      {problem || error ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] font-medium text-live">
          {error ?? t("unreadable")}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[0.8125rem] text-ink-500">{hint}</p>
      )}
    </div>
  );
}
