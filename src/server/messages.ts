import "server-only";
import type { MemberTitle } from "@/lib/permissions";
import { db } from "./db";

/*
  Messages between a member and the team. Each member has one conversation;
  every message is either from the member or a staff reply.
  "Read" is tracked per side: staff see which members wrote and were not read
  yet, members see which replies they have not opened yet.
*/

export interface ChatMessage {
  id: number;
  fromStaff: boolean;
  /** who on the team wrote it (staff replies only) */
  staffName: string | null;
  body: string;
  createdAt: Date;
}

interface ChatRow {
  id: number;
  from_staff: boolean;
  staff_name: string | null;
  body: string;
  created_at: Date;
}

const toChat = (r: ChatRow): ChatMessage => ({
  id: r.id,
  fromStaff: r.from_staff,
  staffName: r.staff_name,
  body: r.body,
  createdAt: r.created_at,
});

export async function listThread(memberCode: number, limit = 200): Promise<ChatMessage[]> {
  const database = await db();
  const rows = await database.query<ChatRow>(
    `select * from (
       select m.id, m.from_staff, s.name as staff_name, m.body, m.created_at
         from messages m left join staff s on s.id = m.staff_id
        where m.member_code = $1
        order by m.created_at desc, m.id desc
        limit $2
     ) recent
     order by created_at asc, id asc`,
    [memberCode, limit],
  );
  return rows.map(toChat);
}

export async function addMemberMessage(memberCode: number, body: string): Promise<ChatMessage> {
  const database = await db();
  const [row] = await database.query<ChatRow>(
    `insert into messages (member_code, from_staff, body, read_by_member)
     values ($1, false, $2, true)
     returning id, from_staff, null::text as staff_name, body, created_at`,
    [memberCode, body],
  );
  return toChat(row);
}

export async function addStaffReply(
  memberCode: number,
  staffId: number,
  body: string,
): Promise<ChatMessage> {
  const database = await db();
  return database.transaction(async (tx) => {
    const [row] = await tx.query<ChatRow>(
      `insert into messages (member_code, from_staff, staff_id, body, read_by_staff)
       values ($1, true, $2, $3, true)
       returning id, from_staff, (select name from staff where id = $2) as staff_name, body, created_at`,
      [memberCode, staffId, body],
    );
    // answering a conversation means the team has read what the member wrote
    await tx.query(
      "update messages set read_by_staff = true where member_code = $1 and not from_staff",
      [memberCode],
    );
    return toChat(row);
  });
}

export async function markReadByMember(memberCode: number) {
  const database = await db();
  await database.query(
    "update messages set read_by_member = true where member_code = $1 and from_staff and not read_by_member",
    [memberCode],
  );
}

export async function markReadByStaff(memberCode: number) {
  const database = await db();
  await database.query(
    "update messages set read_by_staff = true where member_code = $1 and not from_staff and not read_by_staff",
    [memberCode],
  );
}

/** Replies from the team that this member has not opened yet. */
export async function unreadReplies(memberCode: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    `select count(*)::int as n from messages
      where member_code = $1 and from_staff and not read_by_member`,
    [memberCode],
  );
  return row?.n ?? 0;
}

/** Conversations in which a member wrote and nobody on the team has read it yet. */
export async function unreadConversations(): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    `select count(distinct member_code)::int as n from messages
      where not from_staff and not read_by_staff`,
  );
  return row?.n ?? 0;
}

export interface Conversation {
  code: number;
  email: string;
  title: MemberTitle;
  lastBody: string;
  lastAt: Date;
  lastFromStaff: boolean;
  unread: number;
}

export async function listConversations(opts: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<Conversation[]> {
  const database = await db();
  const rows = await database.query<{
    code: number;
    email: string;
    title: MemberTitle;
    last_body: string;
    last_at: Date;
    last_from_staff: boolean;
    unread: number;
  }>(
    `select m.code, m.email, m.title,
            lm.body as last_body, lm.created_at as last_at, lm.from_staff as last_from_staff,
            (select count(*)::int from messages x
              where x.member_code = m.code and not x.from_staff and not x.read_by_staff) as unread
       from members m
       join lateral (
         select body, created_at, from_staff from messages
          where member_code = m.code
          order by created_at desc, id desc limit 1
       ) lm on true
      where ($1::boolean = false
             or exists (select 1 from messages y
                         where y.member_code = m.code and not y.from_staff and not y.read_by_staff))
      order by lm.created_at desc
      limit $2`,
    [Boolean(opts.unreadOnly), Math.min(opts.limit ?? 100, 300)],
  );
  return rows.map((r) => ({
    code: r.code,
    email: r.email,
    title: r.title,
    lastBody: r.last_body,
    lastAt: r.last_at,
    lastFromStaff: r.last_from_staff,
    unread: r.unread,
  }));
}
