"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { videoFileType } from "@/lib/video-source";
import { staffFor } from "@/server/current";
import {
  abortMultipart,
  deleteFile,
  fileSize,
  finishMultipart,
  listParts,
  MAX_VIDEO_BYTES,
  partBytes,
  partCountFor,
  partSizeFor,
  signPart,
  startMultipart,
  storageConfigured,
} from "@/server/storage";
import {
  attachFile,
  clearPendingUpload,
  detachVideo,
  getPendingUpload,
  savePendingUpload,
  type PendingUpload,
} from "@/server/video-files";
import { getVideoRecord } from "@/server/videos";

/*
  Sending a formation's video from a phone, straight to the storage in pieces:
    1. start    -> we open the upload and hand out a signed address per piece (or, if the same file
                   was already partly sent, only for the pieces still missing)
    2. the browser sends each piece to its address (and asks for a fresh address if one ran out)
    3. finish   -> we check that every piece is there, close the upload and attach the file
  Everything here is for the team (permission "videos_manage"). The browser never chooses the
  file's key: it is made here and remembered in `video_uploads`.
*/

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

/** The longest video the form accepts, in seconds (600 minutes). */
const MAX_SECONDS = 600 * 60;

export type UploadStart =
  | {
      ok: true;
      uploadId: string;
      partSize: number;
      partCount: number;
      /** pieces the storage already has (a resumed upload) */
      done: number[];
      /** a signed address for each piece still to send */
      urls: Record<number, string>;
      resumed: boolean;
    }
  | Fail;

export async function startVideoUploadAction(
  slug: string,
  file: { name: string; size: number; lastModified: number },
): Promise<UploadStart> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  if (!storageConfigured()) return fail("storage_off");

  const size = Math.floor(Number(file.size));
  if (!Number.isFinite(size) || size <= 0) return fail("required");
  if (size > MAX_VIDEO_BYTES) return fail("video_too_big");
  const name = String(file.name ?? "").slice(0, 200);
  const type = videoFileType(name);
  if (!type) return fail("unsupported_video");
  if (!(await getVideoRecord(slug))) return fail("unknown_video");
  const lastModified = Math.floor(Number(file.lastModified) || 0);

  try {
    const partCount = partCountFor(size);
    let pending = await getPendingUpload(slug);
    let done: number[] = [];
    let resumed = false;

    if (pending && pending.bytes === size && pending.fileName === name && pending.lastModified === lastModified) {
      // the same file again: carry on where it stopped (if the storage still has that upload)
      try {
        done = (await listParts(pending.key, pending.uploadId))
          .filter((p) => p.number >= 1 && p.number <= partCount && p.size === partBytes(size, p.number))
          .map((p) => p.number);
        resumed = true;
      } catch {
        await clearPendingUpload(slug);
        pending = null;
      }
    } else if (pending) {
      await abortMultipart(pending.key, pending.uploadId);
      await clearPendingUpload(slug);
      pending = null;
    }

    if (!pending) {
      const key = `videos/${randomUUID()}.${type.ext}`;
      const uploadId = await startMultipart(key, type.mime);
      pending = { slug, uploadId, key, fileName: name, bytes: size, lastModified, contentType: type.mime };
      await savePendingUpload(pending);
    }

    const urls: Record<number, string> = {};
    for (let n = 1; n <= partCount; n += 1) {
      if (!done.includes(n)) urls[n] = await signPart(pending.key, pending.uploadId, n);
    }
    return { ok: true, uploadId: pending.uploadId, partSize: partSizeFor(size), partCount, done, urls, resumed };
  } catch (error) {
    console.error("[video-upload] start failed:", error);
    return fail("upload_failed");
  }
}

/** Fresh signed addresses for some pieces (the first ones ran out, for a very long upload). */
export async function signVideoPartsAction(
  slug: string,
  uploadId: string,
  numbers: number[],
): Promise<{ ok: true; urls: Record<number, string> } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  const pending = await getPendingUpload(slug);
  if (!pending || pending.uploadId !== uploadId) return fail("unknown_upload");
  const count = partCountFor(pending.bytes);
  try {
    const urls: Record<number, string> = {};
    for (const n of numbers.slice(0, 50)) {
      if (Number.isInteger(n) && n >= 1 && n <= count) urls[n] = await signPart(pending.key, pending.uploadId, n);
    }
    return { ok: true, urls };
  } catch (error) {
    console.error("[video-upload] sign failed:", error);
    return fail("upload_failed");
  }
}

/** Every piece has been sent: check, close the upload and make it the formation's video. */
export async function finishVideoUploadAction(
  slug: string,
  uploadId: string,
  seconds: number,
): Promise<{ ok: true } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  const pending = await getPendingUpload(slug);
  if (!pending || pending.uploadId !== uploadId) return fail("unknown_upload");

  try {
    const count = partCountFor(pending.bytes);
    const parts = await listParts(pending.key, pending.uploadId);
    const complete =
      parts.length === count && parts.every((p, i) => p.number === i + 1 && p.size === partBytes(pending.bytes, p.number));
    if (!complete) return fail("upload_incomplete");

    await finishMultipart(pending.key, pending.uploadId, parts);
    if ((await fileSize(pending.key)) !== pending.bytes) {
      await deleteFile(pending.key);
      await clearPendingUpload(slug);
      return fail("upload_failed");
    }

    const length = Math.min(MAX_SECONDS, Math.max(0, Math.round(Number(seconds) || 0)));
    const { attached, previousKey } = await attachFile(slug, pending.key, pending.bytes, length);
    if (!attached) {
      await deleteFile(pending.key);
      return fail("unknown_video");
    }
    if (previousKey) after(() => deleteFile(previousKey));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[video-upload] finish failed:", error);
    return fail("upload_failed");
  }
}

/** Give up on an upload that is under way. */
export async function cancelVideoUploadAction(slug: string): Promise<{ ok: true } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  const pending: PendingUpload | null = await getPendingUpload(slug);
  if (pending) {
    await abortMultipart(pending.key, pending.uploadId);
    await clearPendingUpload(slug);
  }
  return { ok: true };
}

/** Take the video off a formation (an uploaded file is deleted from the storage). */
export async function removeVideoAction(slug: string): Promise<{ ok: true } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  const { found, previousKey } = await detachVideo(slug);
  if (!found) return fail("unknown_video");
  if (previousKey) after(() => deleteFile(previousKey));
  revalidatePath("/", "layout");
  return { ok: true };
}
