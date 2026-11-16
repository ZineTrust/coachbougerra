import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";

export interface MemberNotification {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  /** where a tap leads (a path inside the site), when there is one */
  url: string | null;
  /** the picture's address token (see imagePath), when there is one */
  imageToken: string | null;
}

/** The address of a notification's picture. The token cannot be guessed, so the address can be public. */
export const imagePath = (token: string) => `/api/notification-image/${token}`;

/** Only a path inside the site is kept as a link: never another address. */
export function safePath(url: string | null | undefined): string | null {
  const v = (url ?? "").trim();
  return /^\/(?!\/)[\w\-./?=&%#]{0,200}$/.test(v) ? v : null;
}

export interface SentNotification {
  id: number;
  title: string;
  body: string;
  audience: "all" | "codes";
  createdAt: Date;
  sender: string | null;
  /** member numbers, for audience "codes" */
  codes: number[];
  readCount: number;
  imageToken: string | null;
}

/**
 * A member sees: notifications sent to everyone since they registered, plus
 * any addressed to their own number.
 */
const VISIBLE = `
  ( (n.audience = 'all' and n.created_at >= m.created_at)
    or exists (select 1 from notification_targets t
                where t.notification_id = n.id and t.member_code = m.code) )`;

export async function sendNotification(input: {
  title: string;
  body: string;
  codes: number[] | "all";
  /** the staff member sending it; null for a message the site sends by itself */
  staffId: number | null;
  /** a path inside the site where a tap leads */
  url?: string | null;
  /** a picture: a JPEG, base64 */
  image?: string | null;
}): Promise<{ id: number; recipients: number | "all"; imageToken: string | null }> {
  const database = await db();
  return database.transaction(async (tx) => {
    const audience = input.codes === "all" ? "all" : "codes";
    const [row] = await tx.query<{ id: number }>(
      `insert into notifications (title, body, audience, sent_by, url)
       values ($1, $2, $3, $4, $5) returning id`,
      [input.title, input.body, audience, input.staffId, safePath(input.url)],
    );
    let imageToken: string | null = null;
    if (input.image) {
      imageToken = randomBytes(12).toString("base64url");
      await tx.query(
        `insert into notification_images (notification_id, token, data_b64) values ($1, $2, $3)`,
        [row.id, imageToken, input.image],
      );
    }
    if (input.codes !== "all") {
      await tx.query(
        `insert into notification_targets (notification_id, member_code)
         select $1, (jsonb_array_elements_text($2::jsonb))::int`,
        [row.id, JSON.stringify(input.codes)],
      );
    }
    return { id: row.id, recipients: input.codes === "all" ? "all" : input.codes.length, imageToken };
  });
}

export async function listSentNotifications(limit = 50): Promise<SentNotification[]> {
  const database = await db();
  const rows = await database.query<{
    id: number;
    title: string;
    body: string;
    audience: "all" | "codes";
    created_at: Date;
    sender: string | null;
    codes: number[];
    read_count: number;
    image_token: string | null;
  }>(
    `select n.id, n.title, n.body, n.audience, n.created_at, s.name as sender,
            (select i.token from notification_images i where i.notification_id = n.id) as image_token,
            coalesce((select array_agg(t.member_code order by t.member_code)
                        from notification_targets t where t.notification_id = n.id), '{}') as codes,
            (select count(*)::int from notification_reads r where r.notification_id = n.id) as read_count
       from notifications n left join staff s on s.id = n.sent_by
      order by n.created_at desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    audience: r.audience,
    createdAt: r.created_at,
    sender: r.sender,
    codes: r.codes,
    readCount: r.read_count,
    imageToken: r.image_token,
  }));
}

export async function notificationsForMember(code: number, limit = 50): Promise<MemberNotification[]> {
  const database = await db();
  const rows = await database.query<{
    id: number;
    title: string;
    body: string;
    created_at: Date;
    read: boolean;
    url: string | null;
    image_token: string | null;
  }>(
    `select n.id, n.title, n.body, n.created_at, n.url,
            (select i.token from notification_images i where i.notification_id = n.id) as image_token,
            exists (select 1 from notification_reads r
                     where r.notification_id = n.id and r.member_code = m.code) as read
       from notifications n
       join members m on m.code = $1
      where ${VISIBLE}
      order by n.created_at desc limit $2`,
    [code, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    read: r.read,
    url: r.url,
    imageToken: r.image_token,
  }));
}

/** A notification's picture, by its token (the token is the only key: it is hard to guess). */
export async function getNotificationImage(token: string): Promise<{ base64: string; createdAt: Date } | null> {
  if (!/^[\w-]{8,40}$/.test(token)) return null;
  const database = await db();
  const [row] = await database.query<{ data_b64: string; created_at: Date }>(
    "select data_b64, created_at from notification_images where token = $1",
    [token],
  );
  return row ? { base64: row.data_b64, createdAt: row.created_at } : null;
}

export async function unreadCount(code: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    `select count(*)::int as n
       from notifications n
       join members m on m.code = $1
      where ${VISIBLE}
        and not exists (select 1 from notification_reads r
                         where r.notification_id = n.id and r.member_code = m.code)`,
    [code],
  );
  return row?.n ?? 0;
}

export async function markAllRead(code: number) {
  const database = await db();
  await database.query(
    `insert into notification_reads (notification_id, member_code)
     select n.id, m.code
       from notifications n
       join members m on m.code = $1
      where ${VISIBLE}
     on conflict do nothing`,
    [code],
  );
}

export async function notificationStats() {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    "select count(*)::int as n from notifications",
  );
  return { sent: row.n };
}
