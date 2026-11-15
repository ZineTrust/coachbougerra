"use server";

import { revalidatePath } from "next/cache";
import { isReservableLive } from "@/lib/calendar";
import { GRANT_ALL_LIVES } from "@/lib/permissions";
import { getScript } from "@/lib/toolbox";
import { currentMember } from "@/server/current";
import { setDone, setReservation } from "@/server/engagement";
import { getLive } from "@/server/lives";
import { getGrants } from "@/server/members";
import { removeSubscription, saveSubscription } from "@/server/push";
import { videoAccessFor } from "@/server/unlocks";
import { getPublicVideoWithPv } from "@/server/videos";
import type { FormState } from "./types";

/** Member: mark a formation as finished (or not). One that needs PV must be unlocked first. */
export async function toggleVideoDoneAction(slug: string, done: boolean): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const video = await getPublicVideoWithPv(slug);
  if (!video) return { errors: { form: "unknown_video" } };
  if (video.pv > 0 && !(await videoAccessFor(member.code))(slug)) {
    return { errors: { form: "forbidden" } };
  }

  await setDone(member.code, `video:${slug}`, done);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Member: they copied a toolbox script, which counts as using it. */
export async function markScriptUsedAction(id: string): Promise<void> {
  const member = await currentMember();
  if (!member || !getScript(id)) return;
  await setDone(member.code, `toolbox:${id}`, true);
  revalidatePath("/", "layout");
}

/**
 * Member: reserve (or cancel) a place at a live. The date must be the one the team planned (a live
 * that moved leaves no reservation on the old date), and the live must not be over.
 */
export async function toggleReservationAction(
  liveId: string,
  startsAtIso: string,
  reserved: boolean,
): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const live = await getLive(liveId);
  if (!live || live.access === "team") return { errors: { form: "unknown_live" } };

  const startsAt = new Date(startsAtIso);
  if (startsAt.getTime() !== live.startsAt.getTime()) return { errors: { form: "generic" } };
  // a place can still be given back after the live began, but a new one can only be taken on a live to come
  if (reserved && !isReservableLive(live)) return { errors: { form: "generic" } };

  if (reserved && live.access === "premium") {
    const grants = await getGrants(member.code);
    if (!grants.includes(GRANT_ALL_LIVES) && !grants.includes(`live:${liveId}`)) {
      return { errors: { form: "forbidden" } };
    }
  }

  await setReservation(member.code, liveId, startsAt, reserved);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Member: this device agreed to receive notifications. */
export async function savePushSubscriptionAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  if (!sub.endpoint.startsWith("https://") || !sub.p256dh || !sub.auth) {
    return { errors: { form: "generic" } };
  }
  await saveSubscription(member.code, sub);
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<void> {
  const member = await currentMember();
  if (!member) return;
  await removeSubscription(member.code, endpoint);
}
