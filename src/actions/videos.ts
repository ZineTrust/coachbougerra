"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import sharp from "sharp";
import { redirect } from "@/i18n/navigation";
import { VIDEO_CATEGORIES } from "@/lib/data";
import { MAX_PV } from "@/lib/unlock";
import { parseVideoLink } from "@/lib/video-source";
import { staffFor } from "@/server/current";
import { sendNotification } from "@/server/notifications";
import { sendPush } from "@/server/push";
import {
  createVideo,
  deleteVideo,
  getVideoRecord,
  moveVideo,
  removeCover,
  setCover,
  setVideoPv,
  setVideoStatus,
  updateVideo,
  type VideoInput,
} from "@/server/videos";
import type { FormState } from "./types";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;
const MAX_MINUTES = 600;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Reads and checks the formation form. `input` is null when something is wrong. */
function readInput(fd: FormData) {
  const titleFr = text(fd, "titleFr");
  const titleAr = text(fd, "titleAr");
  const descriptionFr = text(fd, "descriptionFr");
  const descriptionAr = text(fd, "descriptionAr");
  const category = text(fd, "category");
  const minutes = text(fd, "minutes");
  const pvRaw = text(fd, "pv");
  const link = text(fd, "link");
  const status = text(fd, "status") === "published" ? "published" : "draft";
  const notify = fd.get("notify") === "on";

  const values = {
    titleFr,
    titleAr,
    descriptionFr,
    descriptionAr,
    category,
    minutes,
    pv: pvRaw,
    link,
    status,
    notify: notify ? "on" : "",
  };

  const errors: Record<string, string> = {};
  if (!titleFr && !titleAr) errors.titleFr = "title_required";
  if (titleFr.length > TITLE_MAX) errors.titleFr = "too_long";
  if (titleAr.length > TITLE_MAX) errors.titleAr = "too_long";
  if (descriptionFr.length > DESCRIPTION_MAX) errors.descriptionFr = "too_long";
  if (descriptionAr.length > DESCRIPTION_MAX) errors.descriptionAr = "too_long";

  const knownCategory = VIDEO_CATEGORIES.find((c) => c === category);
  if (!knownCategory) errors.category = "required";

  let durationSeconds = 0;
  if (minutes) {
    if (/^\d{1,3}$/.test(minutes) && Number(minutes) <= MAX_MINUTES) durationSeconds = Number(minutes) * 60;
    else errors.minutes = "invalid_duration";
  }

  let pv = 0;
  if (pvRaw) {
    if (/^\d{1,6}$/.test(pvRaw) && Number(pvRaw) <= MAX_PV) pv = Number(pvRaw);
    else errors.pv = "invalid_pv";
  }

  const source = link ? parseVideoLink(link) : null;
  if (link && !source) errors.link = "invalid_video_link";

  const input: VideoInput | null =
    Object.keys(errors).length === 0 && knownCategory
      ? { titleFr, titleAr, descriptionFr, descriptionAr, category: knownCategory, durationSeconds, pv, source, status }
      : null;
  return { values, errors, input, notify };
}

/** Tells every member (notification + push) that a formation is out. Both languages: members use either. */
async function announce(slug: string, titleFr: string, titleAr: string, staffId: number) {
  const title = "Nouvelle formation · دورة جديدة";
  const body = [titleFr, titleAr].filter(Boolean).join(" · ");
  await sendNotification({ title, body, codes: "all", staffId });
  after(() => sendPush("all", { title, body, url: `/videos/${slug}` }));
}

/**
 * Staff: create a formation (no `slug` in the form) or change one. Creating sends the team to the
 * formation's page, where the cover image can be added.
 */
export async function saveVideoAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const slug = text(fd, "slug");
  const { values, errors, input, notify } = readInput(fd);
  if (!input) return { errors, values };

  if (!slug) {
    const created = await createVideo(input, staff.id);
    if (input.status === "published" && notify) {
      await announce(created, input.titleFr, input.titleAr, staff.id);
    }
    revalidatePath("/", "layout");
    redirect({ href: `/espace/videos/${created}?cree=1`, locale: await getLocale() });
    return { ok: true };
  }

  const existing = await getVideoRecord(slug);
  if (!existing || !(await updateVideo(slug, input))) {
    return { errors: { form: "unknown_video" }, values };
  }
  if (input.status === "published" && existing.video.status === "draft" && notify) {
    await announce(slug, input.titleFr, input.titleAr, staff.id);
  }
  revalidatePath("/", "layout");
  return { ok: true, values };
}

/** Staff: publish or unpublish from the list. */
export async function setVideoStatusAction(slug: string, status: string): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (status !== "draft" && status !== "published") return { errors: { form: "generic" } };
  if (!(await setVideoStatus(slug, status))) return { errors: { form: "unknown_video" } };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff: change the order (the order here is the one members see and that "Mon parcours" follows). */
export async function moveVideoAction(slug: string, direction: string): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (direction !== "up" && direction !== "down") return { errors: { form: "generic" } };
  await moveVideo(slug, direction);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff: delete a formation. Requests already made keep their history. */
export async function deleteVideoAction(slug: string): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (!(await deleteVideo(slug))) return { errors: { form: "unknown_video" } };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff: change how much PV a formation needs, from the list (0 makes it free for everyone). */
export async function setVideoPvAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const slug = text(fd, "slug");
  const pvRaw = text(fd, "pv");
  const values = { pv: pvRaw };
  if (!/^\d{1,6}$/.test(pvRaw) || Number(pvRaw) > MAX_PV) return { errors: { pv: "invalid_pv" }, values };

  if (!(await setVideoPv(slug, Number(pvRaw)))) return { errors: { form: "unknown_video" }, values };
  revalidatePath("/", "layout");
  return { ok: true, values };
}

/**
 * The cover is shrunk in the browser first, then decoded and re-encoded here as a real
 * 16:9 JPEG (which also strips any hidden data).
 */
export async function uploadCoverAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const slug = text(fd, "slug");
  const file = fd.get("cover");
  if (!(file instanceof File) || file.size === 0) return { errors: { cover: "required" } };
  if (file.size > 2 * 1024 * 1024) return { errors: { cover: "image_too_big" } };
  if (!(await getVideoRecord(slug))) return { errors: { form: "unknown_video" } };

  try {
    const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(1280, 720, { fit: "cover", position: "attention" })
      .jpeg({ quality: 80 })
      .toBuffer();
    await setCover(slug, jpeg.toString("base64"));
  } catch {
    return { errors: { cover: "invalid_image" } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCoverAction(slug: string): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  await removeCover(slug);
  revalidatePath("/", "layout");
  return { ok: true };
}
