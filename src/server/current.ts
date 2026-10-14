import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { StaffPermission } from "@/lib/permissions";
import { getMember, type Member } from "./members";
import { sessionSubject } from "./session";
import { can, getStaff, type Staff } from "./staff";

/** The signed-in member for this request (null when signed out or suspended). */
export const currentMember = cache(async (): Promise<Member | null> => {
  const code = await sessionSubject("member");
  if (code === null) return null;
  const member = await getMember(code);
  return member && member.status === "active" ? member : null;
});

/** The signed-in staff account for this request (null when signed out or deactivated). */
export const currentStaff = cache(async (): Promise<Staff | null> => {
  const id = await sessionSubject("staff");
  if (id === null) return null;
  const staff = await getStaff(id);
  return staff && staff.active ? staff : null;
});

/* Guards for pages: send the visitor to the right sign-in page. */

export async function requireMember(): Promise<Member> {
  const member = await currentMember();
  if (!member) redirect({ href: "/connexion", locale: await getLocale() });
  return member!;
}

export async function requireStaff(permission?: StaffPermission): Promise<Staff> {
  const staff = await currentStaff();
  const locale = await getLocale();
  if (!staff) redirect({ href: "/espace/connexion", locale });
  if (permission && !can(staff!, permission)) redirect({ href: "/espace", locale });
  return staff!;
}

/** Pages only Coach Bougerra (the owner) may open, e.g. managing staff accounts. */
export async function requireOwner(): Promise<Staff> {
  const staff = await requireStaff();
  if (!staff.isOwner) redirect({ href: "/espace", locale: await getLocale() });
  return staff;
}

/* Guards for server actions: return null instead of redirecting. */

export async function staffFor(permission?: StaffPermission): Promise<Staff | null> {
  const staff = await currentStaff();
  if (!staff) return null;
  return !permission || can(staff, permission) ? staff : null;
}

export async function ownerOnly(): Promise<Staff | null> {
  const staff = await currentStaff();
  return staff?.isOwner ? staff : null;
}
