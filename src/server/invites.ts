import "server-only";
import { randomBytes } from "node:crypto";
import type { MemberTitle } from "@/lib/permissions";
import { db } from "./db";

/*
  Personal invitation links. Every member has a short random token (made the first time they open
  "Inviter"); `/invitation/<token>` shows who invites and leads to sign-up with that token, and the new
  member then keeps `sponsor_code`. The token is random on purpose (not the member number), so links
  cannot be guessed from one another.
*/

const TOKEN = /^[A-Za-z0-9_-]{6,16}$/;

/** True for something that can be a token (anything else is ignored without asking the database). */
export const looksLikeInviteToken = (value: string) => TOKEN.test(value);

export interface Inviter {
  code: number;
  fullName: string | null;
}

export interface Invited {
  code: number;
  fullName: string | null;
  title: MemberTitle;
  createdAt: Date;
}

/** The member's invitation token; made on first use. */
export async function inviteTokenFor(code: number): Promise<string> {
  const database = await db();
  const [existing] = await database.query<{ invite_token: string | null }>(
    "select invite_token from members where code = $1::int",
    [code],
  );
  if (existing?.invite_token) return existing.invite_token;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(6).toString("base64url"); // 8 characters
    try {
      const [made] = await database.query<{ invite_token: string }>(
        `update members set invite_token = $2 where code = $1::int and invite_token is null
         returning invite_token`,
        [code, token],
      );
      if (made) return made.invite_token;
      // another request made it first
      const [again] = await database.query<{ invite_token: string | null }>(
        "select invite_token from members where code = $1::int",
        [code],
      );
      if (again?.invite_token) return again.invite_token;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error; // a token clash: try another
    }
  }
  throw new Error("Could not make an invitation token.");
}

/** Who a token belongs to, if it is an active member's. */
export async function inviterByToken(token: string): Promise<Inviter | null> {
  if (!looksLikeInviteToken(token)) return null;
  const database = await db();
  const [row] = await database.query<{ code: number; full_name: string | null }>(
    "select code, full_name from members where invite_token = $1 and status = 'active'",
    [token],
  );
  return row ? { code: row.code, fullName: row.full_name } : null;
}

/** The members who signed up through this member's link, newest first. */
export async function listInvited(code: number): Promise<Invited[]> {
  const database = await db();
  const rows = await database.query<{
    code: number;
    full_name: string | null;
    title: MemberTitle;
    created_at: Date;
  }>(
    `select code, full_name, title, created_at from members
      where sponsor_code = $1::int order by created_at desc limit 200`,
    [code],
  );
  return rows.map((r) => ({ code: r.code, fullName: r.full_name, title: r.title, createdAt: r.created_at }));
}

/** Who invited this member (for the team's member page). */
export async function sponsorOf(code: number): Promise<Inviter | null> {
  const database = await db();
  const [row] = await database.query<{ code: number; full_name: string | null }>(
    `select s.code, s.full_name from members m join members s on s.code = m.sponsor_code where m.code = $1::int`,
    [code],
  );
  return row ? { code: row.code, fullName: row.full_name } : null;
}

export async function invitedCount(code: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    "select count(*)::int as n from members where sponsor_code = $1::int",
    [code],
  );
  return row?.n ?? 0;
}
