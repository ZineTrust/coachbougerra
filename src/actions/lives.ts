"use server";

import { revalidatePath } from "next/cache";
import { LIVES } from "@/lib/data";
import { staffFor } from "@/server/current";
import { setLiveNow } from "@/server/engagement";
import type { FormState } from "./types";

/**
 * Staff: mark a live as on air (or end it with null). While a live is on air,
 * every public page shows the red "EN DIRECT" banner.
 */
export async function setLiveNowAction(liveId: string | null): Promise<FormState> {
  const staff = await staffFor("lives_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (liveId !== null && !LIVES.some((l) => l.id === liveId)) {
    return { errors: { form: "generic" } };
  }

  await setLiveNow(liveId, staff.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
