"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_MESSAGE_MAX,
  GROUP_NAME_MAX,
  MAX_INVITES_AT_ONCE,
} from "@/lib/groups";
import { isMemberTitle, type MemberTitle } from "@/lib/permissions";
import { parseCodes } from "@/lib/validation";
import { currentMember, staffFor } from "@/server/current";
import {
  activeCodes,
  addMembersDirectly,
  addMessage,
  answerInvitation,
  createFriendGroup,
  createOfficialGroup,
  deleteGroup,
  getGroup,
  groupFor,
  inviteMembers,
  leaveGroup,
  markRead,
  messageAuthor,
  removeFromGroup,
  removeMessage,
  renameGroup,
  updateOfficialGroup,
} from "@/server/groups";
import { sendPush } from "@/server/push";
import { allow } from "@/server/rate-limit";
import { deleteFiles } from "@/server/storage";
import type { FormState } from "./types";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const readTitles = (fd: FormData): MemberTitle[] => [
  ...new Set(fd.getAll("title").map(String).filter(isMemberTitle)),
];

/** Name and description of a group, validated. */
function readNameAndDescription(fd: FormData) {
  const name = text(fd, "name");
  const description = text(fd, "description");
  const errors: Record<string, string> = {};
  if (!name) errors.name = "required";
  else if (name.length > GROUP_NAME_MAX) errors.name = "too_long";
  if (description.length > GROUP_DESCRIPTION_MAX) errors.description = "too_long";
  return { name, description, errors };
}

const clean = (body: string) => body.trim();

/* ------------------------------------------------------------------ */
/* Members                                                             */
/* ------------------------------------------------------------------ */

/** Member: start a group of friends (they become its admin). */
export async function createGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const { name, description, errors } = readNameAndDescription(fd);
  const values = { name, description };
  if (Object.keys(errors).length > 0) return { errors, values };
  if (!allow(`group-create:${member.code}`, 10, 60 * 60_000)) {
    return { errors: { form: "too_many_attempts" }, values };
  }

  const id = await createFriendGroup(member.code, name, description || null);
  if (id === null) return { errors: { form: "too_many_groups" }, values };

  revalidatePath("/", "layout");
  redirect({ href: `/groupes/${id}`, locale: await getLocale() });
  return { ok: true };
}

/** Member: write in a group. */
export async function sendGroupMessageAction(groupId: number, rawBody: string): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const body = clean(rawBody);
  if (!body) return { errors: { body: "required" } };
  if (body.length > GROUP_MESSAGE_MAX) return { errors: { body: "too_long" } };

  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access) return { errors: { form: "unknown_group" } };
  if (!access.group.membersCanPost && !access.isAdmin) return { errors: { form: "cannot_post" } };
  if (!allow(`group-message:${member.code}`, 20, 60_000)) {
    return { errors: { form: "too_many_attempts" } };
  }

  const id = await addMessage(groupId, { memberCode: member.code }, body);
  await markRead(groupId, member.code, id);
  return { ok: true, info: { id } };
}

/** Member (admin of a group of friends): invite people by member code. */
export async function inviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const groupId = Number(fd.get("groupId"));
  const input = text(fd, "codes");
  const values = { codes: input };

  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access) return { errors: { form: "unknown_group" }, values };
  if (!access.isAdmin || access.group.kind !== "friends") return { errors: { form: "forbidden" }, values };

  const parsed = parseCodes(input);
  if (parsed.codes.length === 0 && parsed.invalid.length === 0) return { errors: { codes: "required" }, values };
  if (parsed.invalid.length > 0) {
    return { errors: { codes: "invalid_codes" }, values, info: { list: parsed.invalid.slice(0, 10).join(", ") } };
  }
  const codes = parsed.codes.filter((c) => c !== member.code);
  if (codes.length === 0) return { errors: { codes: "required" }, values };
  if (codes.length > MAX_INVITES_AT_ONCE) return { errors: { codes: "too_many_invites" }, values };
  if (!allow(`group-invite:${member.code}`, 60, 60 * 60_000)) {
    return { errors: { form: "too_many_attempts" }, values };
  }

  const result = await inviteMembers(groupId, member.code, codes);
  if (result.invited.length > 0) {
    after(() =>
      sendPush(result.invited, {
        title: access.group.name,
        // the person invited may use either language
        body: "Invitation à rejoindre un groupe · دعوة للانضمام إلى مجموعة",
        url: "/groupes",
      }),
    );
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    info: {
      invited: result.invited.length,
      already: result.already.length,
      unknown: result.unknown.join(", "),
      full: result.full.length,
    },
  };
}

/** Member: accept or decline an invitation. */
export async function answerInvitationAction(groupId: number, accept: boolean): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  if (!Number.isInteger(groupId) || !(await answerInvitation(groupId, member.code, accept))) {
    return { errors: { form: "unknown_group" } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Member: leave a group of friends. */
export async function leaveGroupAction(groupId: number): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access || access.group.kind !== "friends") return { errors: { form: "forbidden" } };

  // when the last member leaves, the group goes and so do its voice notes
  const orphaned = await leaveGroup(groupId, member.code);
  if (orphaned.length > 0) after(() => deleteFiles(orphaned));
  revalidatePath("/", "layout");
  redirect({ href: "/groupes", locale: await getLocale() });
  return { ok: true };
}

/** Member (admin): take someone out of a group of friends. */
export async function removeMemberAction(groupId: number, code: number): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access?.isAdmin || access.group.kind !== "friends" || code === member.code) {
    return { errors: { form: "forbidden" } };
  }
  await removeFromGroup(groupId, code);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Member (admin): rename a group of friends. */
export async function renameGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const groupId = Number(fd.get("groupId"));
  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access?.isAdmin || access.group.kind !== "friends") return { errors: { form: "forbidden" } };

  const { name, description, errors } = readNameAndDescription(fd);
  if (Object.keys(errors).length > 0) return { errors, values: { name, description } };

  await renameGroup(groupId, name, description || null);
  revalidatePath("/", "layout");
  return { ok: true, values: { name, description } };
}

/** Member (admin): delete a group of friends and everything said in it. */
export async function deleteGroupAction(groupId: number): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access?.isAdmin || access.group.kind !== "friends") return { errors: { form: "forbidden" } };

  const voiceFiles = await deleteGroup(groupId);
  if (voiceFiles.length > 0) after(() => deleteFiles(voiceFiles));
  revalidatePath("/", "layout");
  redirect({ href: "/groupes", locale: await getLocale() });
  return { ok: true };
}

/** Member: remove a message they wrote (or any message, for a group's admin). */
export async function removeGroupMessageAction(groupId: number, messageId: number): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };
  const access = Number.isInteger(groupId) ? await groupFor(groupId, member.code) : null;
  if (!access || !Number.isInteger(messageId)) return { errors: { form: "unknown_group" } };

  const author = await messageAuthor(groupId, messageId);
  if (!author) return { errors: { form: "unknown_group" } };
  if (author.memberCode !== member.code && !access.isAdmin) return { errors: { form: "forbidden" } };

  await removeMessage(groupId, messageId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* The team                                                            */
/* ------------------------------------------------------------------ */

/** Team: make a group where some ranks are in automatically (and optionally specific members). */
export async function createOfficialGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const { name, description, errors } = readNameAndDescription(fd);
  const titles = readTitles(fd);
  const codesInput = text(fd, "codes");
  const membersCanPost = fd.get("membersCanPost") === "on";
  const values = {
    name,
    description,
    codes: codesInput,
    titles: titles.join(","),
    membersCanPost: membersCanPost ? "on" : "",
  };
  const info: Record<string, string | number> = {};

  let codes: number[] = [];
  if (codesInput) {
    const parsed = parseCodes(codesInput);
    if (parsed.invalid.length > 0) {
      errors.codes = "invalid_codes";
      info.list = parsed.invalid.slice(0, 10).join(", ");
    } else if (parsed.codes.length > 500) {
      errors.codes = "too_many_codes";
    } else {
      codes = await activeCodes(parsed.codes);
      const missing = parsed.codes.filter((c) => !codes.includes(c));
      if (missing.length > 0) {
        errors.codes = "unknown_codes";
        info.list = missing.slice(0, 10).join(", ");
      }
    }
  }
  if (Object.keys(errors).length === 0 && titles.length === 0 && codes.length === 0) {
    errors.form = "no_audience";
  }
  if (Object.keys(errors).length > 0) return { errors, values, info };

  const id = await createOfficialGroup({
    name,
    description: description || null,
    titles,
    codes,
    membersCanPost,
    staffId: staff.id,
  });
  revalidatePath("/", "layout");
  redirect({ href: `/espace/groupes/${id}`, locale: await getLocale() });
  return { ok: true };
}

/** Team: change an official group (name, ranks, who may write) and/or add members by code. */
export async function updateOfficialGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const groupId = Number(fd.get("groupId"));
  const group = Number.isInteger(groupId) ? await getGroup(groupId) : null;
  if (!group || group.kind !== "official") return { errors: { form: "unknown_group" } };

  const { name, description, errors } = readNameAndDescription(fd);
  const titles = readTitles(fd);
  const addInput = text(fd, "addCodes");
  const membersCanPost = fd.get("membersCanPost") === "on";
  const info: Record<string, string | number> = {};

  let toAdd: number[] = [];
  if (addInput) {
    const parsed = parseCodes(addInput);
    if (parsed.invalid.length > 0) {
      errors.addCodes = "invalid_codes";
      info.list = parsed.invalid.slice(0, 10).join(", ");
    } else {
      toAdd = await activeCodes(parsed.codes);
      const missing = parsed.codes.filter((c) => !toAdd.includes(c));
      if (missing.length > 0) {
        errors.addCodes = "unknown_codes";
        info.list = missing.slice(0, 10).join(", ");
      }
    }
  }
  if (Object.keys(errors).length > 0) return { errors, info };

  await updateOfficialGroup(groupId, { name, description: description || null, titles, membersCanPost });
  await addMembersDirectly(groupId, toAdd);
  revalidatePath("/", "layout");
  return { ok: true, info: { added: toAdd.length } };
}

/** Team: write in any group, as the team. */
export async function staffSendGroupMessageAction(groupId: number, rawBody: string): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const body = clean(rawBody);
  if (!body) return { errors: { body: "required" } };
  if (body.length > GROUP_MESSAGE_MAX) return { errors: { body: "too_long" } };
  if (!Number.isInteger(groupId) || !(await getGroup(groupId))) return { errors: { form: "unknown_group" } };
  if (!allow(`group-staff-message:${staff.id}`, 40, 60_000)) {
    return { errors: { form: "too_many_attempts" } };
  }

  const id = await addMessage(groupId, { staffId: staff.id }, body);
  return { ok: true, info: { id } };
}

/** Team: remove any message (it stays visible to the team, hidden from members). */
export async function staffRemoveGroupMessageAction(groupId: number, messageId: number): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (!Number.isInteger(groupId) || !Number.isInteger(messageId)) return { errors: { form: "unknown_group" } };
  await removeMessage(groupId, messageId);
  return { ok: true };
}

/** Team: take a member out of a group (a member who is in by rank is changed by changing the ranks). */
export async function staffRemoveGroupMemberAction(groupId: number, code: number): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (!Number.isInteger(groupId) || !Number.isInteger(code)) return { errors: { form: "unknown_group" } };
  await removeFromGroup(groupId, code);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Team: delete a group and everything said in it. */
export async function staffDeleteGroupAction(groupId: number): Promise<FormState> {
  const staff = await staffFor("groups_manage");
  if (!staff) return { errors: { form: "forbidden" } };
  if (!Number.isInteger(groupId) || !(await getGroup(groupId))) return { errors: { form: "unknown_group" } };
  const voiceFiles = await deleteGroup(groupId);
  if (voiceFiles.length > 0) after(() => deleteFiles(voiceFiles));
  revalidatePath("/", "layout");
  redirect({ href: "/espace/groupes", locale: await getLocale() });
  return { ok: true };
}
