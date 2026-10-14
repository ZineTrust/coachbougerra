"use server";

import { revalidatePath } from "next/cache";
import { LIVES } from "@/lib/data";
import { GRANT_ALL_LIVES } from "@/lib/permissions";
import { getScript } from "@/lib/toolbox";
import { nextOccurrence } from "@/lib/utils";
import { currentMember } from "@/server/current";
import { setDone, setReservation } from "@/server/engagement";
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
 * Member: reserve (or cancel) a place at a live. The date is checked against the
 * schedule, so only the next two real occurrences can be reserved.
 */
export async function toggleReservationAction(
  liveId: string,
  startsAtIso: string,
  reserved: boolean,
): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const live = LIVES.find((l) => l.id === liveId);
  if (!live || live.access === "team") return { errors: { form: "unknown_member" } };

  const startsAt = new Date(startsAtIso);
  const next = nextOccurrence(live.slot);
  const following = new Date(next.getTime() + 7 * 86_400_000);
  const valid = [next, following].some((d) => d.getTime() === startsAt.getTime());
  if (!valid) return { errors: { form: "generic" } };

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
