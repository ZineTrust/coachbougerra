import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

/*
  Sessions live in the database, not in the cookie: the cookie only carries a
  random token (stored hashed). That lets us cut a session off instantly —
  when a staff account is deactivated, a member suspended, a password reset.

  Members and staff use separate cookies, so Coach Bougerra can be signed in as
  staff and try the member side in the same browser.
*/

export type SessionKind = "member" | "staff";

const COOKIE: Record<SessionKind, string> = {
  member: "ch_member",
  staff: "ch_staff",
};
const LIFETIME_DAYS: Record<SessionKind, number> = { member: 60, staff: 14 };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createSession(kind: SessionKind, subjectId: number) {
  const database = await db();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LIFETIME_DAYS[kind] * 86_400_000);

  await database.query("delete from sessions where expires_at < now()");
  await database.query(
    "insert into sessions (token_hash, kind, subject_id, expires_at) values ($1, $2, $3, $4)",
    [sha256(token), kind, subjectId, expires],
  );

  (await cookies()).set(COOKIE[kind], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** Id of the signed-in member number / staff account, or null. */
export async function sessionSubject(kind: SessionKind): Promise<number | null> {
  const token = (await cookies()).get(COOKIE[kind])?.value;
  if (!token) return null;

  const database = await db();
  const rows = await database.query<{ subject_id: number }>(
    "select subject_id from sessions where token_hash = $1 and kind = $2 and expires_at > now()",
    [sha256(token), kind],
  );
  return rows[0]?.subject_id ?? null;
}

export async function destroySession(kind: SessionKind) {
  const jar = await cookies();
  const token = jar.get(COOKIE[kind])?.value;
  if (token) {
    const database = await db();
    await database.query("delete from sessions where token_hash = $1", [sha256(token)]);
  }
  jar.delete(COOKIE[kind]);
}

/** Signs a member / staff account out everywhere (password reset, suspension…). */
export async function destroyAllSessions(kind: SessionKind, subjectId: number) {
  const database = await db();
  await database.query("delete from sessions where kind = $1 and subject_id = $2", [
    kind,
    subjectId,
  ]);
}
