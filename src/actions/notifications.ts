"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { parseCodes } from "@/lib/validation";
import { currentMember, staffFor } from "@/server/current";
import { existingCodes } from "@/server/members";
import { markAllRead, sendNotification } from "@/server/notifications";
import { sendPush } from "@/server/push";
import type { FormState } from "./types";

/** Staff: send a notification to everyone, or only to specific member numbers. */
export async function sendNotificationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("notifications_send");
  if (!staff) return { errors: { form: "forbidden" } };

  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const audience = fd.get("audience") === "codes" ? "codes" : "all";
  const codesInput = String(fd.get("codes") ?? "");
  const values = { title, body, audience, codes: codesInput };

  const errors: Record<string, string> = {};
  if (!title) errors.title = "required";
  else if (title.length > 120) errors.title = "too_long";
  if (!body) errors.body = "required";
  else if (body.length > 2000) errors.body = "too_long";

  let codes: number[] = [];
  const info: Record<string, string | number> = {};

  if (audience === "codes") {
    const parsed = parseCodes(codesInput);
    if (parsed.codes.length === 0 && parsed.invalid.length === 0) {
      errors.codes = "required";
    } else if (parsed.invalid.length > 0) {
      errors.codes = "invalid_codes";
      info.invalid = parsed.invalid.slice(0, 10).join(", ");
    } else if (parsed.codes.length > 500) {
      errors.codes = "too_many_codes";
    } else {
      const found = await existingCodes(parsed.codes);
      const missing = parsed.codes.filter((c) => !found.includes(c));
      if (missing.length > 0) {
        errors.codes = "unknown_codes";
        info.missing = missing.slice(0, 10).join(", ");
      }
      codes = found;
    }
  }

  if (Object.keys(errors).length > 0) return { errors, values, info };

  const result = await sendNotification({
    title,
    body,
    codes: audience === "all" ? "all" : codes,
    staffId: staff.id,
  });

  // also reach phones that agreed to push notifications (after the response, so the form isn't slowed down)
  after(() =>
    sendPush(audience === "all" ? "all" : codes, {
      title,
      body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
    }),
  );

  revalidatePath("/", "layout");
  return {
    ok: true,
    info: { recipients: result.recipients === "all" ? "all" : result.recipients },
  };
}

/** Member: mark everything as read. */
export async function markAllReadAction(): Promise<void> {
  const member = await currentMember();
  if (!member) return;
  await markAllRead(member.code);
  revalidatePath("/", "layout");
}
