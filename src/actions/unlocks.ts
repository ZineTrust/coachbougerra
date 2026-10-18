"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { VIDEOS } from "@/lib/data";
import { MAX_PV, UNLOCK_NOTE_MAX, lastDayOfMonth } from "@/lib/unlock";
import { parseVideoLink, sourceToLink } from "@/lib/video-source";
import { formatDate } from "@/lib/utils";
import { currentMember, staffFor } from "@/server/current";
import { sendNotification } from "@/server/notifications";
import { sendPush } from "@/server/push";
import { createRequest, decideRequest, getRequest, revokeRequest, videoAccessFor } from "@/server/unlocks";
import { getPublicVideoWithPv, setVideoPv, setVideoSource } from "@/server/videos";
import type { FormState } from "./types";

/** Whole numbers only: "200", not "200,5" or "2e2". */
const parsePv = (raw: string) => (/^\d{1,6}$/.test(raw) ? Number(raw) : null);

/**
 * Member: "I earned this much PV on Ultimate this month, please unlock this
 * formation." Staff then check the PV on the member's Ultimate account.
 */
export async function requestUnlockAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const slug = String(fd.get("slug") ?? "");
  const pvRaw = String(fd.get("pv") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  const locale = fd.get("locale") === "ar" ? "ar" : "fr";
  const values = { pv: pvRaw, note };

  const video = await getPublicVideoWithPv(slug);
  if (!video) return { errors: { form: "unknown_video" } };
  if (video.pv === 0) return { errors: { form: "free_video" } };
  if ((await videoAccessFor(member.code))(slug)) return { errors: { form: "already_unlocked" } };

  const pv = parsePv(pvRaw);
  if (pv === null || pv > MAX_PV) return { errors: { pv: "invalid_pv" }, values };
  if (pv < video.pv) {
    return { errors: { pv: "pv_too_low" }, values, info: { required: video.pv } };
  }
  if (note.length > UNLOCK_NOTE_MAX) return { errors: { note: "too_long" }, values };

  const created = await createRequest({
    memberCode: member.code,
    videoSlug: slug,
    pvClaimed: pv,
    pvRequired: video.pv,
    note: note || null,
    locale,
  });
  if (!created) return { errors: { form: "already_pending" }, values };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Staff: accept or refuse a request, after checking the member's PV on Ultimate.
 * The member is told either way, in the language they asked in (a notification,
 * and a push to their phone if they enabled it).
 */
export async function decideRequestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const id = Number(fd.get("id"));
  const choice = String(fd.get("decision"));
  const reason = String(fd.get("note") ?? "").trim();
  if (!Number.isInteger(id) || (choice !== "approve" && choice !== "reject")) {
    return { errors: { form: "unknown_request" } };
  }
  if (reason.length > UNLOCK_NOTE_MAX) return { errors: { note: "too_long" } };

  const request = await getRequest(id);
  if (!request) return { errors: { form: "unknown_request" } };

  const approved = choice === "approve";
  const done = await decideRequest(id, staff.id, approved ? "approved" : "rejected", reason || null);
  if (!done) return { errors: { form: "request_closed" } };

  const video = VIDEOS.find((v) => v.slug === done.videoSlug);
  const t = await getTranslations({ locale: done.locale, namespace: "unlockNotify" });
  const videoTitle = video?.title[done.locale] ?? done.videoSlug;
  const title = approved ? t("approvedTitle") : t("rejectedTitle");
  const body = approved
    ? t("approvedBody", {
        title: videoTitle,
        date: formatDate(lastDayOfMonth(done.month), done.locale),
      })
    : t("rejectedBody", { title: videoTitle, reason: reason || t("rejectedNoReason") });

  await sendNotification({ title, body, codes: [done.memberCode], staffId: staff.id });
  after(() =>
    sendPush([done.memberCode], {
      title,
      body,
      // the language prefix keeps the member in the language they asked in
      url: approved ? `/${done.locale}/videos/${done.videoSlug}` : `/${done.locale}/compte`,
    }),
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff: take back an approval of this month. */
export async function revokeRequestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || !(await revokeRequest(id, staff.id))) {
    return { errors: { form: "request_closed" } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff: set (or clear, with an empty field) the YouTube / Vimeo link of a formation's video. */
export async function setVideoSourceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const slug = String(fd.get("slug") ?? "");
  const link = String(fd.get("link") ?? "").trim();
  const values = { link };

  if (!VIDEOS.some((v) => v.slug === slug)) return { errors: { form: "unknown_video" } };
  if (link.length > 300) return { errors: { link: "too_long" }, values };

  const source = link ? parseVideoLink(link) : null;
  if (link && !source) return { errors: { link: "invalid_video_link" }, values };

  await setVideoSource(slug, source, staff.id);
  revalidatePath("/", "layout");
  return { ok: true, values: { link: source ? sourceToLink(source) : "" } };
}

/** Staff: change how much PV a formation needs (0 makes it free for everyone). */
export async function setVideoPvAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("videos_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const slug = String(fd.get("slug") ?? "");
  const pvRaw = String(fd.get("pv") ?? "").trim();
  const values = { pv: pvRaw };

  if (!VIDEOS.some((v) => v.slug === slug)) return { errors: { form: "unknown_video" } };
  const pv = parsePv(pvRaw);
  if (pv === null || pv > MAX_PV) return { errors: { pv: "invalid_pv" }, values };

  await setVideoPv(slug, pv, staff.id);
  revalidatePath("/", "layout");
  return { ok: true, values };
}
