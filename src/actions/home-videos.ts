"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { parseVideoLink, videoFileType } from "@/lib/video-source";
import { staffFor } from "@/server/current";
import {
  addHomeVideo,
  deleteHomeVideo,
  HOME_VIDEO_MAX_BYTES,
  HOME_VIDEOS_MAX,
  homeFileKnown,
  listHomeVideos,
  moveHomeVideo,
  setHomeVideoActive,
} from "@/server/home-videos";
import {
  abortMultipart,
  deleteFile,
  fileSize,
  finishMultipart,
  listParts,
  partBytes,
  partCountFor,
  partSizeFor,
  signPart,
  startMultipart,
  storageConfigured,
} from "@/server/storage";
import type { FormState } from "./types";

/*
  The videos at the top of the home page (workspace page "Accueil", permission "videos_manage").

  A file is sent the same way as a formation's video (in pieces, straight to the storage, from the phone),
  but it is kept to a small size: it plays by itself on every visitor's phone, mobile data included.
    1. start   -> we open the upload and hand out a signed address per piece
    2. the browser sends the pieces
    3. finish  -> we check every piece is there, close the upload and add the video to the list
  The browser never chooses the file's key: it is made here, always under "home/", and finish only accepts
  a key of that shape whose upload really exists in the storage.
*/

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

const KEY = /^home\/[0-9a-f-]{36}\.(mp4|m4v|mov|webm)$/;

const countVideos = async () => (await listHomeVideos()).length;

export type HomeUploadStart =
  | { ok: true; key: string; uploadId: string; partSize: number; partCount: number; urls: Record<number, string> }
  | Fail;

export async function startHomeUploadAction(file: { name: string; size: number }): Promise<HomeUploadStart> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  if (!storageConfigured()) return fail("storage_off");
  const size = Math.floor(Number(file.size));
  if (!Number.isFinite(size) || size <= 0) return fail("required");
  if (size > HOME_VIDEO_MAX_BYTES) return fail("home_video_too_big");
  const type = videoFileType(String(file.name ?? "").slice(0, 200));
  if (!type) return fail("unsupported_video");
  if ((await countVideos()) >= HOME_VIDEOS_MAX) return fail("home_videos_full");

  try {
    const key = `home/${randomUUID()}.${type.ext}`;
    const uploadId = await startMultipart(key, type.mime);
    const partCount = partCountFor(size);
    const urls: Record<number, string> = {};
    for (let n = 1; n <= partCount; n += 1) urls[n] = await signPart(key, uploadId, n);
    return { ok: true, key, uploadId, partSize: partSizeFor(size), partCount, urls };
  } catch (error) {
    console.error("[home-video] start failed:", error);
    return fail("upload_failed");
  }
}

/** Fresh signed addresses for some pieces (the first ones ran out). */
export async function signHomePartsAction(
  key: string,
  uploadId: string,
  size: number,
  numbers: number[],
): Promise<{ ok: true; urls: Record<number, string> } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  if (!KEY.test(key) || !(Number(size) > 0) || Number(size) > HOME_VIDEO_MAX_BYTES) return fail("unknown_upload");
  const count = partCountFor(Number(size));
  try {
    const urls: Record<number, string> = {};
    for (const n of numbers.slice(0, 50)) {
      if (Number.isInteger(n) && n >= 1 && n <= count) urls[n] = await signPart(key, uploadId, n);
    }
    return { ok: true, urls };
  } catch (error) {
    console.error("[home-video] sign failed:", error);
    return fail("upload_failed");
  }
}

/** Every piece has been sent: check, close the upload and add the video to the list. */
export async function finishHomeUploadAction(key: string, uploadId: string, size: number): Promise<{ ok: true } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  const bytes = Math.floor(Number(size));
  if (!KEY.test(key) || !(bytes > 0) || bytes > HOME_VIDEO_MAX_BYTES) return fail("unknown_upload");
  if (await homeFileKnown(key)) return { ok: true }; // already added (a repeated call)

  try {
    const count = partCountFor(bytes);
    const parts = await listParts(key, uploadId);
    const complete =
      parts.length === count && parts.every((p, i) => p.number === i + 1 && p.size === partBytes(bytes, p.number));
    if (!complete) return fail("upload_incomplete");

    await finishMultipart(key, uploadId, parts);
    if ((await fileSize(key)) !== bytes) {
      await deleteFile(key);
      return fail("upload_failed");
    }
    const type = videoFileType(key);
    if (!type) {
      await deleteFile(key);
      return fail("unsupported_video");
    }
    await addHomeVideo({ provider: "file", ref: key }, bytes);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[home-video] finish failed:", error);
    return fail("upload_failed");
  }
}

/** Give up on an upload that is under way. */
export async function cancelHomeUploadAction(key: string, uploadId: string): Promise<{ ok: true } | Fail> {
  if (!(await staffFor("videos_manage"))) return fail("forbidden");
  if (KEY.test(key)) await abortMultipart(key, uploadId);
  return { ok: true };
}

/** Staff: add a YouTube or Vimeo video by its link. */
export async function addHomeLinkAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await staffFor("videos_manage"))) return { errors: { form: "forbidden" } };
  const link = String(fd.get("link") ?? "").trim();
  const values = { link };
  if (!link) return { errors: { link: "required" }, values };
  const source = parseVideoLink(link);
  if (!source) return { errors: { link: "invalid_video_link" }, values };
  if ((await countVideos()) >= HOME_VIDEOS_MAX) return { errors: { form: "home_videos_full" }, values };
  await addHomeVideo(source, null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleHomeVideoAction(id: number, active: boolean): Promise<{ ok: boolean }> {
  if (!(await staffFor("videos_manage"))) return { ok: false };
  const done = await setHomeVideoActive(Number(id), Boolean(active));
  revalidatePath("/", "layout");
  return { ok: done };
}

export async function moveHomeVideoAction(id: number, direction: -1 | 1): Promise<{ ok: boolean }> {
  if (!(await staffFor("videos_manage"))) return { ok: false };
  const done = await moveHomeVideo(Number(id), direction === -1 ? -1 : 1);
  revalidatePath("/", "layout");
  return { ok: done };
}

/** Staff: take a video off the home page (an uploaded file is deleted from the storage). */
export async function deleteHomeVideoAction(id: number): Promise<{ ok: boolean }> {
  if (!(await staffFor("videos_manage"))) return { ok: false };
  const { found, fileKey } = await deleteHomeVideo(Number(id));
  if (fileKey) after(() => deleteFile(fileKey));
  revalidatePath("/", "layout");
  return { ok: found };
}
