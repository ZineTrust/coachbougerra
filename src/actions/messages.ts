"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { currentMember, staffFor } from "@/server/current";
import { getMember } from "@/server/members";
import {
  addMemberMessage,
  addStaffReply,
  markReadByMember,
  markReadByStaff,
} from "@/server/messages";
import { sendPush } from "@/server/push";
import { allow } from "@/server/rate-limit";
import type { FormState } from "./types";

const MAX_LENGTH = 2000;

/** Member: write to the team from the contact button. */
export async function sendMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { errors: { body: "required" } };
  if (body.length > MAX_LENGTH) return { errors: { body: "too_long" } };

  // a few messages per ten minutes is plenty for a real conversation
  if (!allow(`message:${member.code}`, 8, 10 * 60_000)) {
    return { errors: { form: "too_many_attempts" } };
  }

  const message = await addMemberMessage(member.code, body);
  return { ok: true, info: { id: message.id } };
}

/** Member: they opened the conversation, so the team's replies count as read. */
export async function markThreadReadAction(): Promise<void> {
  const member = await currentMember();
  if (!member) return;
  await markReadByMember(member.code);
}

/** Staff: answer a member. The member sees it on the contact button. */
export async function staffReplyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("messages_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const code = Number(fd.get("code"));
  if (!Number.isInteger(code) || !(await getMember(code))) {
    return { errors: { form: "unknown_member" } };
  }

  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { errors: { body: "required" }, values: { body } };
  if (body.length > MAX_LENGTH) return { errors: { body: "too_long" }, values: { body } };

  const message = await addStaffReply(code, staff.id, body);
  after(() =>
    sendPush([code], {
      title: "Coach Bougerra",
      body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
      url: "/compte",
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true, info: { id: message.id } };
}

/** Staff: opening a conversation marks what the member wrote as read. */
export async function markConversationReadAction(code: number): Promise<void> {
  const staff = await staffFor("messages_manage");
  if (!staff || !Number.isInteger(code)) return;
  await markReadByStaff(code);
  revalidatePath("/", "layout");
}
