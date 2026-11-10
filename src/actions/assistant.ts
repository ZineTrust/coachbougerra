"use server";

import { revalidatePath } from "next/cache";
import { NOTE_BODY_MAX, NOTE_KEYWORDS_MAX, NOTE_TITLE_MAX } from "@/lib/assistant";
import { forgetKnowledge } from "@/server/assistant/library";
import { createChat, deleteNote, getNote, rateAnswer, saveNote } from "@/server/assistant/store";
import { currentMember, ownerOnly } from "@/server/current";
import { allow } from "@/server/rate-limit";
import type { FormState } from "./types";

/** Member: a thumb up or down on one of the assistant's answers (null takes it back). */
export async function rateAnswerAction(messageId: number, rating: 1 | -1 | null): Promise<{ ok: boolean }> {
  const member = await currentMember();
  if (!member || !Number.isInteger(messageId) || ![1, -1, null].includes(rating)) return { ok: false };
  if (!allow(`assistant-rate:${member.code}`, 120, 60 * 60_000)) return { ok: false };
  return { ok: await rateAnswer(member.code, messageId, rating) };
}

/** Member: start a fresh conversation (the old one stays stored but is no longer shown). */
export async function newChatAction(): Promise<{ chat: number | null }> {
  const member = await currentMember();
  if (!member || !allow(`assistant-new:${member.code}`, 60, 60 * 60_000)) return { chat: null };
  return { chat: await createChat(member.code) };
}

/* ------------------------------ the owner's notes ------------------------------ */

/** Owner: add a note to what the assistant knows, or change one (`id` set). */
export async function saveNoteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const owner = await ownerOnly();
  if (!owner) return { errors: { form: "forbidden" } };

  const rawId = String(fd.get("id") ?? "");
  const id = /^\d+$/.test(rawId) ? Number(rawId) : null;
  const title = String(fd.get("title") ?? "").trim();
  const keywords = String(fd.get("keywords") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const enabled = fd.get("enabled") === "on";
  const values = { title, keywords, body };

  const errors: Record<string, string> = {};
  if (!title) errors.title = "required";
  else if (title.length > NOTE_TITLE_MAX) errors.title = "too_long";
  if (keywords.length > NOTE_KEYWORDS_MAX) errors.keywords = "too_long";
  if (!body) errors.body = "required";
  else if (body.length > NOTE_BODY_MAX) errors.body = "too_long";
  if (Object.keys(errors).length > 0) return { errors, values };
  if (!allow(`assistant-note:${owner.id}`, 120, 60 * 60_000)) return { errors: { form: "too_many_attempts" }, values };

  await saveNote(id, { title, keywords, body, enabled }, owner.id);
  forgetKnowledge();
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Owner: switch a note on or off without losing it. */
export async function toggleNoteAction(id: number, enabled: boolean): Promise<{ ok: boolean }> {
  const owner = await ownerOnly();
  if (!owner || !Number.isInteger(id)) return { ok: false };
  const note = await getNote(id);
  if (!note) return { ok: false };
  await saveNote(id, { title: note.title, keywords: note.keywords, body: note.body, enabled }, owner.id);
  forgetKnowledge();
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Owner: delete a note for good. */
export async function deleteNoteAction(id: number): Promise<{ ok: boolean }> {
  const owner = await ownerOnly();
  if (!owner || !Number.isInteger(id)) return { ok: false };
  await deleteNote(id);
  forgetKnowledge();
  revalidatePath("/", "layout");
  return { ok: true };
}
