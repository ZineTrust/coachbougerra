"use server";

import { revalidatePath } from "next/cache";
import { isStaffPermission, type StaffPermission } from "@/lib/permissions";
import {
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
  type FieldErrors,
} from "@/lib/validation";
import { ownerOnly } from "@/server/current";
import { generatePassword, hashPassword } from "@/server/password";
import { destroyAllSessions } from "@/server/session";
import { createStaff, getStaff, setStaffPassword, updateStaff } from "@/server/staff";
import type { FormState } from "./types";

const permissionsFrom = (fd: FormData): StaffPermission[] =>
  [...new Set(fd.getAll("permission").map(String))].filter(isStaffPermission);

/** Only Coach Bougerra (the owner) can create staff accounts and choose what they may do. */
export async function createStaffAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return { errors: { form: "forbidden" } };

  const name = String(fd.get("name") ?? "").trim();
  const email = normalizeEmail(fd.get("email"));
  const typed = String(fd.get("password") ?? "");
  const permissions = permissionsFrom(fd);
  const values = { name, email };

  const errors: FieldErrors = {};
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (typed) {
    const passwordError = validatePassword(typed);
    if (passwordError) errors.password = passwordError;
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  const password = typed || generatePassword();
  const created = await createStaff({
    name,
    email,
    permissions,
    passwordHash: await hashPassword(password),
  });
  if (!created.ok) return { errors: { email: created.error }, values };

  revalidatePath("/", "layout");
  // shown once, so Bougerra can pass the login on to the person
  return { ok: true, info: { email, password } };
}

/** Change a staff member's name, permissions, or switch the account on/off. */
export async function updateStaffAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return { errors: { form: "forbidden" } };

  const id = Number(fd.get("id"));
  const target = Number.isInteger(id) ? await getStaff(id) : null;
  if (!target || target.isOwner) return { errors: { form: "unknown_staff" } };

  const name = String(fd.get("name") ?? "").trim();
  const nameError = validateName(name);
  if (nameError) return { errors: { name: nameError }, values: { name } };

  const active = fd.get("active") === "on";
  await updateStaff(id, { name, permissions: permissionsFrom(fd), active });
  if (!active) await destroyAllSessions("staff", id);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetStaffPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await ownerOnly())) return { errors: { form: "forbidden" } };

  const id = Number(fd.get("id"));
  const target = Number.isInteger(id) ? await getStaff(id) : null;
  if (!target || target.isOwner) return { errors: { form: "unknown_staff" } };

  const temporary = generatePassword();
  await setStaffPassword(id, await hashPassword(temporary));
  await destroyAllSessions("staff", id);

  return { ok: true, info: { email: target.email, password: temporary } };
}
