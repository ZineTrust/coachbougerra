"use server";

import { revalidatePath } from "next/cache";
import { GRANT_ALL_LIVES, GRANT_ALL_VIDEOS, videoGrant } from "@/lib/permissions";
import { staffFor } from "@/server/current";
import { generatePassword, hashPassword } from "@/server/password";
import { destroyAllSessions } from "@/server/session";
import { listVideos } from "@/server/videos";
import {
  addGrants,
  getMember,
  replaceGrants,
  setMemberPassword,
  setMemberStatus,
} from "@/server/members";
import type { FormState } from "./types";

const memberCode = (fd: FormData) => Number(fd.get("code"));

/** What can be granted: everything, or one formation (any formation the team has created). */
async function allowedGrants() {
  return new Set<string>([
    GRANT_ALL_VIDEOS,
    GRANT_ALL_LIVES,
    ...(await listVideos()).map((v) => videoGrant(v.slug)),
  ]);
}

/** Ticks on the member page: which videos / lives this member may access. */
export async function setGrantsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const code = memberCode(fd);
  if (!Number.isInteger(code) || !(await getMember(code))) {
    return { errors: { form: "unknown_member" } };
  }

  const allowed = await allowedGrants();
  const keys = [...new Set(fd.getAll("grant").map(String))].filter((k) => allowed.has(k));
  await replaceGrants(code, keys, staff.id);

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Quick grant from the members list: add these accesses to every selected
 * member. Nothing already given is taken away (use a member's own page to
 * remove access).
 */
export async function addGrantsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const codes = [...new Set(fd.getAll("code").map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  if (codes.length === 0) return { errors: { form: "unknown_member" } };
  if (codes.length > 500) return { errors: { form: "too_many_codes" } };

  const allowed = await allowedGrants();
  const keys = [...new Set(fd.getAll("grant").map(String))].filter((k) => allowed.has(k));
  if (keys.length === 0) return { errors: { form: "no_grants" } };

  const count = await addGrants(codes, keys, staff.id);
  if (count === 0) return { errors: { form: "unknown_member" } };

  revalidatePath("/", "layout");
  return { ok: true, info: { count } };
}

/** Suspend / reactivate an account (a suspended member is signed out at once). */
export async function setMemberStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const code = memberCode(fd);
  const status = String(fd.get("status"));
  if (!Number.isInteger(code) || (status !== "active" && status !== "suspended")) {
    return { errors: { form: "unknown_member" } };
  }
  if (!(await getMember(code))) return { errors: { form: "unknown_member" } };

  await setMemberStatus(code, status);
  if (status === "suspended") await destroyAllSessions("member", code);

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * For a member who forgot their password: creates a temporary one, shown to
 * staff once so they can pass it on. The member should change it afterwards.
 */
export async function resetMemberPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await staffFor("members_manage");
  if (!staff) return { errors: { form: "forbidden" } };

  const code = memberCode(fd);
  if (!Number.isInteger(code) || !(await getMember(code))) {
    return { errors: { form: "unknown_member" } };
  }

  const temporary = generatePassword();
  await setMemberPassword(code, await hashPassword(temporary));
  await destroyAllSessions("member", code);

  return { ok: true, info: { password: temporary } };
}
