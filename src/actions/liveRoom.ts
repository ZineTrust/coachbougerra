"use server";

import { staffFor } from "@/server/current";
import { banFromLive, removeFromRoom, setOnStage } from "@/server/livekit";
import { getLive } from "@/server/lives";
import type { FormState } from "./types";

/** Only members can be moved: the host's own identity is never a target. */
const MEMBER_IDENTITY = /^member:\d{1,9}$/;

async function target(liveId: string, identity: string) {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } } satisfies FormState;
  if (!MEMBER_IDENTITY.test(identity)) return { errors: { form: "generic" } } satisfies FormState;
  const live = await getLive(liveId);
  if (!live || live.status !== "live") return { errors: { form: "not_live" } } satisfies FormState;
  return null;
}

/** Host: bring a member on stage (they can speak and show their camera), or send them back to the audience. */
export async function setStageAction(liveId: string, identity: string, onStage: boolean): Promise<FormState> {
  const problem = await target(liveId, identity);
  if (problem) return problem;
  if (!(await setOnStage(liveId, identity, onStage))) return { errors: { form: "generic" } };
  return { ok: true };
}

/** Host: send a member out of the room. They cannot come back into this live. */
export async function removeParticipantAction(liveId: string, identity: string): Promise<FormState> {
  const problem = await target(liveId, identity);
  if (problem) return problem;
  banFromLive(liveId, identity);
  await removeFromRoom(liveId, identity);
  return { ok: true };
}
