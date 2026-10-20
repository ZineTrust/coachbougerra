import "server-only";
import { db } from "./db";

export interface MemberNotification {
  id: number;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
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
}): Promise<{ id: number; recipients: number | "all" }> {
  const database = await db();
  return database.transaction(async (tx) => {
    const audience = input.codes === "all" ? "all" : "codes";
    const [row] = await tx.query<{ id: number }>(
      `insert into notifications (title, body, audience, sent_by)
       values ($1, $2, $3, $4) returning id`,
      [input.title, input.body, audience, input.staffId],
    );
    if (input.codes !== "all") {
      await tx.query(
        `insert into notification_targets (notification_id, member_code)
         select $1, (jsonb_array_elements_text($2::jsonb))::int`,
        [row.id, JSON.stringify(input.codes)],
      );
    }
    return { id: row.id, recipients: input.codes === "all" ? "all" : input.codes.length };
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
  }>(
    `select n.id, n.title, n.body, n.audience, n.created_at, s.name as sender,
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
  }>(
    `select n.id, n.title, n.body, n.created_at,
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
  }));
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
