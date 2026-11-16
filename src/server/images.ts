import "server-only";
import sharp from "sharp";

/*
  Pictures the team adds (to a notification, to a live): checked and shrunk here, whatever the browser
  sent, and kept as a small JPEG. The browser already shrinks a phone photo before sending it
  (components/app/ImageField.tsx), so the limit below is only a safety net.
*/

/** The biggest picture accepted, in bytes (it fits the server-action limit set in next.config.ts). */
export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

export type PreparedImage = { ok: true; base64: string } | { ok: false; error: "image_too_big" | "invalid_image" };

/**
 * `cover`: crop to 16:9 (the picture of a live). Otherwise the picture keeps its shape and is only
 * shrunk to fit in 1280 × 1280.
 */
export async function prepareImage(file: FormDataEntryValue | null, mode: "cover" | "free"): Promise<PreparedImage | null> {
  if (!(file instanceof File) || file.size === 0) return null; // nothing was chosen
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "image_too_big" };
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer())).rotate();
    const jpeg = await (mode === "cover"
      ? source.resize(1280, 720, { fit: "cover", position: "attention" })
      : source.resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    )
      .jpeg({ quality: 80 })
      .toBuffer();
    return { ok: true, base64: jpeg.toString("base64") };
  } catch {
    return { ok: false, error: "invalid_image" };
  }
}
