import "server-only";
import type { MemberTitle } from "@/lib/permissions";
import { db } from "./db";

export interface Member {
  code: number;
  email: string;
  phone: string;
  ultimateCode: string;
  title: MemberTitle;
  status: "active" | "suspended";
  createdAt: Date;
  lastLoginAt: Date | null;
  /** profile (all optional) */
  fullName: string | null;
  city: string | null;
  showInRanking: boolean;
}

interface MemberRow {
  code: number;
  email: string;
  phone: string;
  ultimate_code: string;
  title: MemberTitle;
  status: "active" | "suspended";
  created_at: Date;
  last_login_at: Date | null;
  full_name: string | null;
  city: string | null;
  show_in_ranking: boolean;
}

const COLUMNS =
  "code, email, phone, ultimate_code, title, status, created_at, last_login_at, full_name, city, show_in_ranking";

const toMember = (r: MemberRow): Member => ({
  code: r.code,
  email: r.email,
  phone: r.phone,
  ultimateCode: r.ultimate_code,
  title: r.title,
  status: r.status,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
  fullName: r.full_name,
  city: r.city,
  showInRanking: r.show_in_ranking,
});

export type CreateMemberResult =
  | { ok: true; code: number }
  | { ok: false; field: "email" | "ultimateCode"; error: "email_taken" | "ultimate_taken" };

/**
 * Creates the account and hands out the next member number (101, 102, …).
 * The number comes from a counter row updated in the same transaction as the
 * insert, so a failed sign-up rolls the counter back: numbers never skip.
 */
export async function createMember(input: {
  email: string;
  passwordHash: string;
  phone: string;
  ultimateCode: string;
  title: MemberTitle;
}): Promise<CreateMemberResult> {
  const database = await db();
  try {
    const code = await database.transaction(async (tx) => {
      const [emailTaken] = await tx.query("select 1 from members where email = $1", [input.email]);
      if (emailTaken) throw new Taken("email", "email_taken");
      const [ultimateTaken] = await tx.query(
        "select 1 from members where lower(ultimate_code) = lower($1)",
        [input.ultimateCode],
      );
      if (ultimateTaken) throw new Taken("ultimateCode", "ultimate_taken");

      const [{ value }] = await tx.query<{ value: number }>(
        "update counters set value = value + 1 where name = 'member_code' returning value",
      );
      await tx.query(
        `insert into members (code, email, password_hash, phone, ultimate_code, title)
         values ($1, $2, $3, $4, $5, $6)`,
        [value, input.email, input.passwordHash, input.phone, input.ultimateCode, input.title],
      );
      return value;
    });
    return { ok: true, code };
  } catch (error) {
    if (error instanceof Taken) return { ok: false, field: error.field, error: error.reason };
    // two people registering the same e-mail at the exact same moment
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, field: "email", error: "email_taken" };
    }
    throw error;
  }
}

class Taken extends Error {
  constructor(
    readonly field: "email" | "ultimateCode",
    readonly reason: "email_taken" | "ultimate_taken",
  ) {
    super(reason);
  }
}

/** Used only by the sign-in flow: includes the password hash. */
export async function findMemberForLogin(
  by: { code: number } | { email: string },
): Promise<(Member & { passwordHash: string }) | null> {
  const database = await db();
  const [row] =
    "code" in by
      ? await database.query<MemberRow & { password_hash: string }>(
          `select ${COLUMNS}, password_hash from members where code = $1`,
          [by.code],
        )
      : await database.query<MemberRow & { password_hash: string }>(
          `select ${COLUMNS}, password_hash from members where email = $1`,
          [by.email],
        );
  return row ? { ...toMember(row), passwordHash: row.password_hash } : null;
}

export async function getMember(code: number): Promise<Member | null> {
  const database = await db();
  const [row] = await database.query<MemberRow>(
    `select ${COLUMNS} from members where code = $1`,
    [code],
  );
  return row ? toMember(row) : null;
}

export async function touchMemberLogin(code: number) {
  const database = await db();
  await database.query("update members set last_login_at = now() where code = $1", [code]);
}

export async function getMemberPasswordHash(code: number) {
  const database = await db();
  const [row] = await database.query<{ password_hash: string }>(
    "select password_hash from members where code = $1",
    [code],
  );
  return row?.password_hash ?? null;
}

export async function setMemberPassword(code: number, passwordHash: string) {
  const database = await db();
  await database.query("update members set password_hash = $2 where code = $1", [
    code,
    passwordHash,
  ]);
}

/** Name, city and the ranking choice: all optional, edited by the member. */
export async function updateProfile(
  code: number,
  profile: { fullName: string | null; city: string | null; showInRanking: boolean },
) {
  const database = await db();
  await database.query(
    "update members set full_name = $2, city = $3, show_in_ranking = $4 where code = $1",
    [code, profile.fullName, profile.city, profile.showInRanking],
  );
}

/** A profile counts as complete once the name and the city are filled in. */
export const isProfileComplete = (m: Pick<Member, "fullName" | "city">) =>
  Boolean(m.fullName?.trim() && m.city?.trim());

export async function setMemberStatus(code: number, status: "active" | "suspended") {
  const database = await db();
  await database.query("update members set status = $2 where code = $1", [code, status]);
}

export interface MemberListItem extends Member {
  grants: string[];
}

export async function listMembers(opts: {
  query?: string;
  title?: MemberTitle;
  limit?: number;
}): Promise<{ members: MemberListItem[]; total: number }> {
  const database = await db();
  const q = (opts.query ?? "").trim();
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const where = `
    where ($1 = '' or code::text = $1 or email ilike $2 or phone like $2
           or ultimate_code ilike $2 or full_name ilike $2)
      and ($3 = '' or title = $3)`;
  const params = [q, like, opts.title ?? ""];

  const rows = await database.query<MemberRow & { grants: string[] }>(
    `select ${COLUMNS},
            coalesce((select array_agg(g.grant_key order by g.grant_key)
                        from member_grants g where g.member_code = members.code), '{}') as grants
       from members ${where}
      order by code desc limit ${Math.min(opts.limit ?? 200, 500)}`,
    params,
  );
  const [{ n }] = await database.query<{ n: number }>(
    `select count(*)::int as n from members ${where}`,
    params,
  );
  return { members: rows.map((r) => ({ ...toMember(r), grants: r.grants })), total: n };
}

export async function memberStats() {
  const database = await db();
  const [row] = await database.query<{ total: number; week: number }>(
    `select count(*)::int as total,
            count(*) filter (where created_at > now() - interval '7 days')::int as week
       from members`,
  );
  return { total: row.total, week: row.week };
}

export async function recentMembers(limit = 5): Promise<Member[]> {
  const database = await db();
  const rows = await database.query<MemberRow>(
    `select ${COLUMNS} from members order by code desc limit $1`,
    [limit],
  );
  return rows.map(toMember);
}

/* ------------------------------ access grants ------------------------------ */

export async function getGrants(code: number): Promise<string[]> {
  const database = await db();
  const rows = await database.query<{ grant_key: string }>(
    "select grant_key from member_grants where member_code = $1 order by grant_key",
    [code],
  );
  return rows.map((r) => r.grant_key);
}

/** Replaces all of a member's grants with `keys`. */
export async function replaceGrants(code: number, keys: string[], staffId: number) {
  const database = await db();
  await database.transaction(async (tx) => {
    await tx.query("delete from member_grants where member_code = $1", [code]);
    for (const key of keys) {
      await tx.query(
        "insert into member_grants (member_code, grant_key, granted_by) values ($1, $2, $3)",
        [code, key, staffId],
      );
    }
  });
}

/**
 * Gives every listed member these accesses, keeping what they already have.
 * Returns how many of the listed members exist (numbers that don't are ignored).
 */
export async function addGrants(codes: number[], keys: string[], staffId: number): Promise<number> {
  const found = await existingCodes(codes);
  if (found.length === 0 || keys.length === 0) return found.length;

  const database = await db();
  await database.query(
    `insert into member_grants (member_code, grant_key, granted_by)
     select c.code, g.key, $3
       from (select jsonb_array_elements_text($1::jsonb)::int as code) c
       cross join (select jsonb_array_elements_text($2::jsonb) as key) g
     on conflict do nothing`,
    [JSON.stringify(found), JSON.stringify(keys), staffId],
  );
  return found.length;
}

/** Which of these member numbers really exist? */
export async function existingCodes(codes: number[]): Promise<number[]> {
  if (codes.length === 0) return [];
  const database = await db();
  const rows = await database.query<{ code: number }>(
    `select code from members
      where code in (select jsonb_array_elements_text($1::jsonb)::int)
      order by code`,
    [JSON.stringify(codes)],
  );
  return rows.map((r) => r.code);
}
