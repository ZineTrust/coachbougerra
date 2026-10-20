"use server";

import { revalidatePath } from "next/cache";
import { MAX_PV, monthKey } from "@/lib/unlock";
import { currentMember } from "@/server/current";
import { saveProgress, saveTarget } from "@/server/goals";
import { allow } from "@/server/rate-limit";
import type { FormState } from "./types";

const whole = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^\d{1,6}$/.test(text) ? Number(text) : null;
};

/** Member: set (or change) this month's PV goal. */
export async function saveGoalAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const raw = String(fd.get("target") ?? "").trim();
  const values = { target: raw };
  const target = whole(fd.get("target"));
  if (target === null || target < 1 || target > MAX_PV) return { errors: { target: "invalid_pv" }, values };
  if (!allow(`goal:${member.code}`, 60, 60 * 60_000)) return { errors: { form: "too_many_attempts" }, values };

  await saveTarget(member.code, monthKey(), target);
  revalidatePath("/", "layout");
  return { ok: true, values };
}

/** Member: write down the PV made so far this month. */
export async function saveProgressAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const raw = String(fd.get("current") ?? "").trim();
  const values = { current: raw };
  const current = whole(fd.get("current"));
  if (current === null || current > MAX_PV) return { errors: { current: "invalid_pv" }, values };
  if (!allow(`goal:${member.code}`, 60, 60 * 60_000)) return { errors: { form: "too_many_attempts" }, values };

  if (!(await saveProgress(member.code, monthKey(), current))) return { errors: { form: "generic" }, values };
  revalidatePath("/", "layout");
  return { ok: true, values };
}
