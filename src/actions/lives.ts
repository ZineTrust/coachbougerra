"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Live, LiveAccess } from "@/lib/data";
import { formatLiveDay, formatLiveTime, parseAlgiersLocal } from "@/lib/utils";
import { staffFor } from "@/server/current";
import { prepareImage } from "@/server/images";
import { closeRoom, openRoom } from "@/server/livekit";
import {
  cancelLive,
  copyLiveCover,
  createLive,
  deleteLive,
  endLive,
  getLive,
  getLiveCover,
  removeLiveCover,
  reservedCodes,
  setLiveCover,
  startLive,
  updateLive,
  type LiveInput,
} from "@/server/lives";
import { imagePath, sendNotification } from "@/server/notifications";
import { sendPush } from "@/server/push";
import { allow } from "@/server/rate-limit";
import { getVideoRecord } from "@/server/videos";
import type { FormState } from "./types";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const HOST_MAX = 80;
const WEEK_MS = 7 * 86_400_000;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Reads and checks the form. `input` is null when something is wrong. */
async function readInput(fd: FormData, creating: boolean) {
  const titleFr = text(fd, "titleFr");
  const titleAr = text(fd, "titleAr");
  const descriptionFr = text(fd, "descriptionFr");
  const descriptionAr = text(fd, "descriptionAr");
  const host = text(fd, "host") || "Coach Bouguerra";
  const accessRaw = text(fd, "access");
  const date = text(fd, "date");
  const time = text(fd, "time");
  const lengthRaw = text(fd, "length") || "60";
  const replay = text(fd, "replaySlug");
  const notify = fd.get("notify") === "on";

  const values: Record<string, string> = {
    titleFr,
    titleAr,
    descriptionFr,
    descriptionAr,
    host,
    access: accessRaw,
    date,
    time,
    length: lengthRaw,
    replaySlug: replay,
    notify: notify ? "on" : "",
  };

  const errors: Record<string, string> = {};
  if (!titleFr && !titleAr) errors.titleFr = "title_required";
  if (titleFr.length > TITLE_MAX) errors.titleFr = "too_long";
  if (titleAr.length > TITLE_MAX) errors.titleAr = "too_long";
  if (descriptionFr.length > DESCRIPTION_MAX) errors.descriptionFr = "too_long";
  if (descriptionAr.length > DESCRIPTION_MAX) errors.descriptionAr = "too_long";
  if (host.length > HOST_MAX) errors.host = "too_long";

  const access: LiveAccess | null =
    accessRaw === "free" || accessRaw === "premium" || accessRaw === "team" ? accessRaw : null;
  if (!access) errors.access = "required";

  const startsAt = parseAlgiersLocal(`${date}T${time}`);
  if (!startsAt) errors.date = "invalid_live_date";
  // a new live can start right now, but not in the past
  else if (creating && startsAt.getTime() < Date.now() - 15 * 60_000) errors.date = "live_in_past";

  let length = 60;
  if (/^\d{1,3}$/.test(lengthRaw) && Number(lengthRaw) >= 5 && Number(lengthRaw) <= 600) length = Number(lengthRaw);
  else errors.length = "invalid_live_length";

  let replaySlug: string | null = null;
  if (replay) {
    if (await getVideoRecord(replay)) replaySlug = replay;
    else errors.replaySlug = "unknown_video";
  }

  // an optional picture, shown on the live's card and page and in its announcements
  const picture = await prepareImage(fd.get("image"), "cover");
  if (picture && !picture.ok) errors.image = picture.error;
  const removePicture = fd.get("removeImage") === "1";

  const input: LiveInput | null =
    Object.keys(errors).length === 0 && access && startsAt
      ? { titleFr, titleAr, descriptionFr, descriptionAr, host, access, startsAt, length, replaySlug }
      : null;
  return { values, errors, input, notify, picture: picture?.ok ? picture.base64 : null, removePicture };
}

const both = (fr: string, ar: string) => [fr, ar].filter(Boolean).join(" · ");

/** "jeudi 19 novembre · 21h00 | الخميس 19 نوفمبر · 21:00": members read either language. */
function whenText(startsAt: Date) {
  return `${formatLiveDay(startsAt, "fr")} ${formatLiveTime(startsAt, "fr")} · ${formatLiveDay(startsAt, "ar")} ${formatLiveTime(startsAt, "ar")}`;
}

/** Who a live's notifications go to: everybody for a free live, only the people who reserved for a reserved one. */
async function audienceFor(live: Pick<Live, "id" | "access" | "startsAt">): Promise<"all" | number[] | null> {
  if (live.access === "team") return null;
  if (live.access === "free") return "all";
  return reservedCodes(live.id, live.startsAt);
}

async function announce(
  live: Pick<Live, "id" | "access" | "startsAt"> & { titleFr: string; titleAr: string },
  kind: "planned" | "reminder" | "started",
  staffId: number,
): Promise<number | "all"> {
  const audience = await audienceFor(live);
  if (audience === null || (Array.isArray(audience) && audience.length === 0)) return 0;

  const title =
    kind === "started" ? "En direct · مباشر" : kind === "reminder" ? "Rappel · تذكير" : "Nouveau live · بث مباشر جديد";
  const name = both(live.titleFr, live.titleAr);
  const body = kind === "started" ? name : `${name} — ${whenText(live.startsAt)}`;
  // the live's picture goes along, and a tap opens the live
  const cover = await getLiveCover(live.id);
  const url = `/lives/${live.id}`;
  const sent = await sendNotification({ title, body, codes: audience, staffId, url, image: cover?.base64 ?? null });
  after(() =>
    sendPush(audience, { title, body, url, image: sent.imageToken ? imagePath(sent.imageToken) : undefined }),
  );
  return sent.recipients;
}

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Staff: plan a live (no `id` in the form) or change one. A change of date carries the places people
 * already reserved along to the new date.
 */
export async function saveLiveAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const id = text(fd, "id");
  const { values, errors, input, notify, picture, removePicture } = await readInput(fd, !id);
  if (!input) return { errors, values };

  if (!id) {
    const created = await createLive(input, staff.id);
    if (picture) await setLiveCover(created, picture);
    if (notify) {
      await announce({ id: created, access: input.access, startsAt: input.startsAt, titleFr: input.titleFr, titleAr: input.titleAr }, "planned", staff.id);
    }
    refresh();
    return { ok: true, info: { id: created } };
  }

  if (!(await updateLive(id, input))) return { errors: { form: "unknown_live" }, values };
  if (picture) await setLiveCover(id, picture);
  else if (removePicture) await removeLiveCover(id);
  refresh();
  return { ok: true, values };
}

/**
 * Staff: open the room. The red banner shows on every page, and (when asked) the members who can come are
 * warned on their phone.
 */
export async function startLiveAction(id: string, notify: boolean): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const live = await getLive(id);
  if (!live) return { errors: { form: "unknown_live" } };
  const result = await startLive(id);
  if (result === "missing") return { errors: { form: "unknown_live" } };
  if (result === "closed") return { errors: { form: "live_closed" } };
  if (result === "other_on_air") return { errors: { form: "other_live_on_air" } };

  // the room is made ready (limits set) before the first person walks in
  after(() => openRoom(id));

  // a live already on air is only resumed: nobody is warned twice
  let warned: number | "all" = 0;
  if (notify && live.status !== "live") {
    warned = await announce(
      { id: live.id, access: live.access, startsAt: live.startsAt, titleFr: live.typed.titleFr, titleAr: live.typed.titleAr },
      "started",
      staff.id,
    );
  }
  refresh();
  return { ok: true, info: { warned } };
}

/** Staff: close the room for everybody and take the banner down. */
export async function endLiveAction(id: string): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (!(await endLive(id))) return { errors: { form: "unknown_live" } };
  after(() => closeRoom(id));
  refresh();
  return { ok: true };
}

/** Staff: a planned live that will not happen. The people who reserved are told. */
export async function cancelLiveAction(id: string): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const live = await getLive(id);
  if (!live) return { errors: { form: "unknown_live" } };
  const codes = await reservedCodes(live.id, live.startsAt);
  if (!(await cancelLive(id))) return { errors: { form: "live_not_planned" } };

  if (codes.length > 0) {
    const title = "Live annulé · تم إلغاء البث";
    const body = `${both(live.typed.titleFr, live.typed.titleAr)} — ${whenText(live.startsAt)}`;
    await sendNotification({ title, body, codes, staffId: staff.id, url: "/lives" });
    after(() => sendPush(codes, { title, body, url: "/lives" }));
  }
  refresh();
  return { ok: true };
}

/** Staff: remove a live from the list (and the places reserved for it). */
export async function deleteLiveAction(id: string): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  const live = await getLive(id);
  if (!live) return { errors: { form: "unknown_live" } };
  if (live.status === "live") return { errors: { form: "live_on_air" } };
  if (!(await deleteLive(id))) return { errors: { form: "unknown_live" } };
  refresh();
  return { ok: true };
}

/** Staff: the same live, one week later (the usual weekly rendez-vous). */
export async function duplicateLiveAction(id: string): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const live = await getLive(id);
  if (!live) return { errors: { form: "unknown_live" } };
  // the next free week: copying an old live lands in the future
  let startsAt = new Date(live.startsAt.getTime() + WEEK_MS);
  while (startsAt.getTime() < Date.now()) startsAt = new Date(startsAt.getTime() + WEEK_MS);

  const created = await createLive(
    {
      ...live.typed,
      host: live.host,
      access: live.access,
      startsAt,
      length: live.length,
      replaySlug: null,
    },
    staff.id,
  );
  await copyLiveCover(live.id, created);
  refresh();
  return { ok: true, info: { id: created } };
}

/** Staff: warn the members who reserved a place that it is soon. */
export async function remindLiveAction(id: string): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const live = await getLive(id);
  if (!live) return { errors: { form: "unknown_live" } };
  if (live.status !== "scheduled") return { errors: { form: "live_not_planned" } };
  if (!allow(`live-remind:${id}`, 1, 10 * 60_000)) return { errors: { form: "too_many_attempts" } };

  const codes = await reservedCodes(live.id, live.startsAt);
  if (codes.length === 0) return { errors: { form: "no_reservations" } };

  const title = "Rappel · تذكير";
  const body = `${both(live.typed.titleFr, live.typed.titleAr)} — ${whenText(live.startsAt)}`;
  const cover = await getLiveCover(live.id);
  const sent = await sendNotification({
    title,
    body,
    codes,
    staffId: staff.id,
    url: `/lives/${live.id}`,
    image: cover?.base64 ?? null,
  });
  after(() =>
    sendPush(codes, {
      title,
      body,
      url: `/lives/${live.id}`,
      image: sent.imageToken ? imagePath(sent.imageToken) : undefined,
    }),
  );
  return { ok: true, info: { warned: codes.length } };
}
