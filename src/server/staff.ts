import "server-only";
import {
  STAFF_PERMISSIONS,
  isStaffPermission,
  type StaffPermission,
} from "@/lib/permissions";
import { db } from "./db";

export interface Staff {
  id: number;
  name: string;
  email: string;
  isOwner: boolean;
  /** Only meaningful for non-owners; the owner can do everything. */
  permissions: StaffPermission[];
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

interface StaffRow {
  id: number;
  name: string;
  email: string;
  is_owner: boolean;
  permissions: string[];
  active: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

const COLUMNS = "id, name, email, is_owner, permissions, active, created_at, last_login_at";

const toStaff = (r: StaffRow): Staff => ({
  id: r.id,
  name: r.name,
  email: r.email,
  isOwner: r.is_owner,
  permissions: (r.permissions ?? []).filter(isStaffPermission),
  active: r.active,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

/** The owner always passes; everyone else needs the permission ticked. */
export const can = (staff: Pick<Staff, "isOwner" | "permissions">, permission: StaffPermission) =>
  staff.isOwner || staff.permissions.includes(permission);

export const effectivePermissions = (staff: Pick<Staff, "isOwner" | "permissions">) =>
  staff.isOwner ? [...STAFF_PERMISSIONS] : staff.permissions;

export async function findStaffForLogin(
  email: string,
): Promise<(Staff & { passwordHash: string }) | null> {
  const database = await db();
  const [row] = await database.query<StaffRow & { password_hash: string }>(
    `select ${COLUMNS}, password_hash from staff where email = $1`,
    [email],
  );
  return row ? { ...toStaff(row), passwordHash: row.password_hash } : null;
}

export async function getStaff(id: number): Promise<Staff | null> {
  const database = await db();
  const [row] = await database.query<StaffRow>(`select ${COLUMNS} from staff where id = $1`, [id]);
  return row ? toStaff(row) : null;
}

export async function listStaff(): Promise<Staff[]> {
  const database = await db();
  const rows = await database.query<StaffRow>(
    `select ${COLUMNS} from staff order by is_owner desc, created_at`,
  );
  return rows.map(toStaff);
}

export async function staffCount() {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    "select count(*)::int as n from staff where active",
  );
  return row.n;
}

export async function touchStaffLogin(id: number) {
  const database = await db();
  await database.query("update staff set last_login_at = now() where id = $1", [id]);
}

export async function createStaff(input: {
  name: string;
  email: string;
  passwordHash: string;
  permissions: StaffPermission[];
}): Promise<{ ok: true; id: number } | { ok: false; error: "email_taken" }> {
  const database = await db();
  const [existing] = await database.query("select 1 from staff where email = $1", [input.email]);
  if (existing) return { ok: false, error: "email_taken" };

  const [row] = await database.query<{ id: number }>(
    `insert into staff (name, email, password_hash, permissions)
     values ($1, $2, $3, $4::jsonb) returning id`,
    [input.name, input.email, input.passwordHash, JSON.stringify(input.permissions)],
  );
  return { ok: true, id: row.id };
}

export async function updateStaff(
  id: number,
  patch: { name: string; permissions: StaffPermission[]; active: boolean },
) {
  const database = await db();
  await database.query(
    `update staff set name = $2, permissions = $3::jsonb, active = $4
      where id = $1 and not is_owner`,
    [id, patch.name, JSON.stringify(patch.permissions), patch.active],
  );
}

export async function getStaffPasswordHash(id: number) {
  const database = await db();
  const [row] = await database.query<{ password_hash: string }>(
    "select password_hash from staff where id = $1",
    [id],
  );
  return row?.password_hash ?? null;
}

export async function setStaffPassword(id: number, passwordHash: string) {
  const database = await db();
  await database.query("update staff set password_hash = $2 where id = $1", [id, passwordHash]);
}
