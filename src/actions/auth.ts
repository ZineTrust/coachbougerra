"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isMemberTitle } from "@/lib/permissions";
import {
  classifyIdentifier,
  normalizeEmail,
  normalizePhone,
  normalizeUltimateCode,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUltimateCode,
  type FieldErrors,
} from "@/lib/validation";
import { currentMember, currentStaff } from "@/server/current";
import {
  createMember,
  findMemberForLogin,
  getMemberPasswordHash,
  setMemberPassword,
  touchMemberLogin,
} from "@/server/members";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/password";
import { allow, reset } from "@/server/rate-limit";
import { createSession, destroyAllSessions, destroySession } from "@/server/session";
import {
  findStaffForLogin,
  getStaffPasswordHash,
  setStaffPassword,
  touchStaffLogin,
} from "@/server/staff";
import type { FormState } from "./types";

const WINDOW = 15 * 60_000;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const text = (fd: FormData, name: string) => String(fd.get(name) ?? "");

/* ------------------------------------------------------------------ */
/* Member: register                                                    */
/* ------------------------------------------------------------------ */

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const title = text(fd, "title");
  const email = normalizeEmail(fd.get("email"));
  const phone = normalizePhone(fd.get("phone"));
  const ultimateCode = normalizeUltimateCode(fd.get("ultimateCode"));
  const password = text(fd, "password");
  const values = { title, email, phone, ultimateCode };

  const errors: FieldErrors = {};
  if (!isMemberTitle(title)) errors.title = "required";
  const checks: [string, string | null][] = [
    ["email", validateEmail(email)],
    ["phone", validatePhone(phone)],
    ["ultimateCode", validateUltimateCode(ultimateCode)],
    ["password", validatePassword(password)],
  ];
  for (const [field, error] of checks) if (error) errors[field] = error;
  if (Object.keys(errors).length > 0) return { errors, values };

  // no more than a handful of sign-ups per hour from one address
  if (!allow(`register:${await clientIp()}`, 10, 60 * 60_000)) {
    return { errors: { form: "too_many_attempts" }, values };
  }

  const created = await createMember({
    email,
    phone,
    ultimateCode,
    title: title as never,
    passwordHash: await hashPassword(password),
  });
  if (!created.ok) return { errors: { [created.field]: created.error }, values };

  await createSession("member", created.code);
  redirect({ href: "/compte?bienvenue=1", locale: await getLocale() });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Member: sign in with e-mail or member number + password             */
/* ------------------------------------------------------------------ */

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const identifier = text(fd, "identifier").trim();
  const password = text(fd, "password");
  const values = { identifier };

  if (!identifier || !password) return { errors: { form: "invalid_credentials" }, values };

  const idKey = `login:${identifier.toLowerCase()}`;
  if (!allow(`login-ip:${await clientIp()}`, 40, WINDOW) || !allow(idKey, 8, WINDOW)) {
    return { errors: { form: "too_many_attempts" }, values };
  }

  const which = classifyIdentifier(identifier);
  const member = await findMemberForLogin(
    which.kind === "code" ? { code: which.code } : { email: which.email },
  );

  // 1) a member signing in
  if (member && (await verifyPassword(password, member.passwordHash))) {
    if (member.status !== "active") return { errors: { form: "suspended" }, values };

    reset(idKey);
    await createSession("member", member.code);
    await touchMemberLogin(member.code);
    redirect({ href: "/compte", locale: await getLocale() });
    return { ok: true };
  }

  // 2) a staff member using the same door: an e-mail + their staff password
  //    takes them straight to the workspace
  const staff = which.kind === "email" ? await findStaffForLogin(which.email) : null;
  if (staff && (await verifyPassword(password, staff.passwordHash))) {
    if (!staff.active) return { errors: { form: "suspended" }, values };

    reset(idKey);
    await createSession("staff", staff.id);
    await touchStaffLogin(staff.id);
    redirect({ href: "/espace", locale: await getLocale() });
    return { ok: true };
  }

  // neither: same answer and same work whether or not the account exists
  if (!member && !staff) await verifyAgainstDummy(password);
  return { errors: { form: "invalid_credentials" }, values };
}

/* ------------------------------------------------------------------ */
/* Staff: sign in (separate page, separate cookie)                      */
/* ------------------------------------------------------------------ */

export async function staffLoginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(fd.get("email"));
  const password = text(fd, "password");
  const values = { email };

  if (!email || !password) return { errors: { form: "invalid_credentials" }, values };

  const idKey = `staff-login:${email}`;
  if (!allow(`staff-login-ip:${await clientIp()}`, 30, WINDOW) || !allow(idKey, 6, WINDOW)) {
    return { errors: { form: "too_many_attempts" }, values };
  }

  const staff = await findStaffForLogin(email);
  if (!staff) {
    await verifyAgainstDummy(password);
    return { errors: { form: "invalid_credentials" }, values };
  }
  if (!(await verifyPassword(password, staff.passwordHash))) {
    return { errors: { form: "invalid_credentials" }, values };
  }
  if (!staff.active) return { errors: { form: "suspended" }, values };

  reset(idKey);
  await createSession("staff", staff.id);
  await touchStaffLogin(staff.id);
  redirect({ href: "/espace", locale: await getLocale() });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Sign out                                                             */
/* ------------------------------------------------------------------ */

export async function logoutMemberAction() {
  await destroySession("member");
  redirect({ href: "/", locale: await getLocale() });
}

export async function logoutStaffAction() {
  await destroySession("staff");
  redirect({ href: "/espace/connexion", locale: await getLocale() });
}

/* ------------------------------------------------------------------ */
/* Change password (own account)                                        */
/* ------------------------------------------------------------------ */

async function changePassword(
  fd: FormData,
  who: { kind: "member" | "staff"; id: number; currentHash: string | null },
): Promise<FormState> {
  const current = text(fd, "current");
  const next = text(fd, "next");

  const errors: FieldErrors = {};
  if (!current) errors.current = "required";
  const weak = validatePassword(next);
  if (weak) errors.next = weak;
  if (Object.keys(errors).length > 0) return { errors };

  if (!allow(`pwd:${who.kind}:${who.id}`, 6, WINDOW)) {
    return { errors: { form: "too_many_attempts" } };
  }
  if (!who.currentHash || !(await verifyPassword(current, who.currentHash))) {
    return { errors: { current: "wrong_password" } };
  }

  const hash = await hashPassword(next);
  if (who.kind === "member") await setMemberPassword(who.id, hash);
  else await setStaffPassword(who.id, hash);

  // sign out every other device, keep this one
  await destroyAllSessions(who.kind, who.id);
  await createSession(who.kind, who.id);
  return { ok: true };
}

export async function changeMemberPasswordAction(_prev: FormState, fd: FormData) {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } } satisfies FormState;
  return changePassword(fd, {
    kind: "member",
    id: member.code,
    currentHash: await getMemberPasswordHash(member.code),
  });
}

export async function changeStaffPasswordAction(_prev: FormState, fd: FormData) {
  const staff = await currentStaff();
  if (!staff) return { errors: { form: "forbidden" } } satisfies FormState;
  return changePassword(fd, {
    kind: "staff",
    id: staff.id,
    currentHash: await getStaffPasswordHash(staff.id),
  });
}
