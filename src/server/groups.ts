import "server-only";
import {
  MAX_FRIEND_GROUPS_PER_MEMBER,
  MAX_FRIEND_GROUP_SIZE,
  type GroupKind,
} from "@/lib/groups";
import { isMemberTitle, type MemberTitle } from "@/lib/permissions";
import { db } from "./db";

/*
  Groups: small chats between members.
  - "friends": a member makes it and invites others by member code (they accept or decline).
  - "official": made by the team. Some ranks are in automatically (every Manager…), and
    specific members can be added. Who is in by rank is worked out from each member's
    current rank at the time, so nobody has to be added by hand.
  The team (staff with the groups permission) can read every group.
*/

export interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  kind: GroupKind;
  titles: MemberTitle[];
  membersCanPost: boolean;
  createdAt: Date;
}

export interface GroupSummary extends GroupRow {
  isAdmin: boolean;
  memberCount: number;
  unread: number;
  last: { body: string; createdAt: Date; author: Author } | null;
}

export interface Author {
  fromStaff: boolean;
  /** member number (null for the team) */
  code: number | null;
  /** the member's full name, or the staff account's name */
  name: string | null;
}

export interface GroupMessage {
  id: number;
  author: Author;
  body: string;
  removed: boolean;
  createdAt: Date;
}

export interface GroupMember {
  code: number;
  fullName: string | null;
  city: string | null;
  title: MemberTitle;
  isAdmin: boolean;
  /** "invited" = has not answered yet (friends groups) */
  status: "member" | "invited";
  /** added one by one (as opposed to being in an official group only through their rank) */
  explicit: boolean;
}

export interface Invitation {
  groupId: number;
  name: string;
  description: string | null;
  invitedAt: Date;
  inviterCode: number | null;
  inviterName: string | null;
}

interface RawGroup {
  id: number;
  name: string;
  description: string | null;
  kind: GroupKind;
  titles: string[];
  members_can_post: boolean;
  created_at: Date;
}

const toGroup = (r: RawGroup): GroupRow => ({
  id: r.id,
  name: r.name,
  description: r.description,
  kind: r.kind,
  titles: (r.titles ?? []).filter(isMemberTitle),
  membersCanPost: r.members_can_post,
  createdAt: r.created_at,
});

/** SQL: how many active members are in group `g` (explicit ones plus those in by rank). */
const MEMBER_COUNT = `(select count(*)::int from members mm
   where mm.status = 'active' and (
     exists (select 1 from group_members z
              where z.group_id = g.id and z.member_code = mm.code and z.status = 'member')
     or (g.kind = 'official' and g.titles @> jsonb_build_array(mm.title))))`;

/* --------------------------------- reading --------------------------------- */

/** The groups this member is in, with unread counts and the last message of each. */
export async function listMyGroups(code: number): Promise<GroupSummary[]> {
  const database = await db();
  const rows = await database.query<
    RawGroup & { is_admin: boolean; member_count: number; unread: number }
  >(
    `select g.id, g.name, g.description, g.kind, g.titles, g.members_can_post, g.created_at,
            coalesce(me.is_admin, false) as is_admin,
            ${MEMBER_COUNT} as member_count,
            (select count(*)::int from group_messages x
              where x.group_id = g.id and not x.removed
                and x.id > coalesce(r.last_read_id, 0)
                and x.member_code is distinct from $1::int) as unread
       from groups g
       join members m on m.code = $1::int
       left join group_members me
              on me.group_id = g.id and me.member_code = m.code and me.status = 'member'
       left join group_reads r on r.group_id = g.id and r.member_code = m.code
      where me.member_code is not null
         or (g.kind = 'official' and g.titles @> jsonb_build_array(m.title))
      order by g.created_at desc`,
    [code],
  );
  return attachLast(
    rows.map((r) => ({
      ...toGroup(r),
      isAdmin: r.is_admin,
      memberCount: r.member_count,
      unread: r.unread,
      last: null,
    })),
  );
}

async function attachLast(groups: GroupSummary[]): Promise<GroupSummary[]> {
  if (groups.length === 0) return groups;
  const database = await db();
  const rows = await database.query<{
    group_id: number;
    body: string;
    created_at: Date;
    member_code: number | null;
    staff_id: number | null;
    full_name: string | null;
    staff_name: string | null;
  }>(
    `select distinct on (gm.group_id) gm.group_id, gm.body, gm.created_at, gm.member_code, gm.staff_id,
            m.full_name, s.name as staff_name
       from group_messages gm
       left join members m on m.code = gm.member_code
       left join staff s on s.id = gm.staff_id
      where gm.group_id in (select jsonb_array_elements_text($1::jsonb)::int) and not gm.removed
      order by gm.group_id, gm.id desc`,
    [JSON.stringify(groups.map((g) => g.id))],
  );
  const byGroup = new Map(rows.map((r) => [r.group_id, r]));
  return groups
    .map((g) => {
      const r = byGroup.get(g.id);
      return {
        ...g,
        last: r
          ? {
              body: r.body,
              createdAt: r.created_at,
              author: {
                fromStaff: r.staff_id !== null,
                code: r.member_code,
                name: r.staff_id !== null ? r.staff_name : r.full_name,
              },
            }
          : null,
      };
    })
    // the most recent conversation first
    .sort(
      (a, b) =>
        (b.last?.createdAt ?? b.createdAt).getTime() - (a.last?.createdAt ?? a.createdAt).getTime(),
    );
}

export async function listInvitations(code: number): Promise<Invitation[]> {
  const database = await db();
  const rows = await database.query<{
    id: number;
    name: string;
    description: string | null;
    created_at: Date;
    invited_by: number | null;
    inviter_name: string | null;
  }>(
    `select g.id, g.name, g.description, gm.created_at, gm.invited_by, inv.full_name as inviter_name
       from group_members gm
       join groups g on g.id = gm.group_id
       left join members inv on inv.code = gm.invited_by
      where gm.member_code = $1::int and gm.status = 'invited'
      order by gm.created_at desc`,
    [code],
  );
  return rows.map((r) => ({
    groupId: r.id,
    name: r.name,
    description: r.description,
    invitedAt: r.created_at,
    inviterCode: r.invited_by,
    inviterName: r.inviter_name,
  }));
}

/** What the header shows: pending invitations + unread messages. */
export async function groupsBadge(code: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ invites: number; unread: number }>(
    `select
       (select count(*)::int from group_members
         where member_code = $1::int and status = 'invited') as invites,
       (select count(*)::int from group_messages x
          join groups g on g.id = x.group_id
          join members m on m.code = $1::int
          left join group_members me
                 on me.group_id = g.id and me.member_code = m.code and me.status = 'member'
          left join group_reads r on r.group_id = g.id and r.member_code = m.code
         where not x.removed and x.member_code is distinct from m.code
           and x.id > coalesce(r.last_read_id, 0)
           and (me.member_code is not null
                or (g.kind = 'official' and g.titles @> jsonb_build_array(m.title)))) as unread`,
    [code],
  );
  return (row?.invites ?? 0) + (row?.unread ?? 0);
}

export async function getGroup(id: number): Promise<GroupRow | null> {
  const database = await db();
  const [row] = await database.query<RawGroup>(
    `select id, name, description, kind, titles, members_can_post, created_at
       from groups where id = $1::int`,
    [id],
  );
  return row ? toGroup(row) : null;
}

/** The group, if this member is in it (explicitly, or by rank in an official group). */
export async function groupFor(
  id: number,
  code: number,
): Promise<{ group: GroupRow; isAdmin: boolean } | null> {
  const database = await db();
  const [row] = await database.query<RawGroup & { is_admin: boolean; is_member: boolean }>(
    `select g.id, g.name, g.description, g.kind, g.titles, g.members_can_post, g.created_at,
            coalesce(me.is_admin, false) as is_admin,
            (me.member_code is not null
             or (g.kind = 'official' and g.titles @> jsonb_build_array(m.title))) as is_member
       from groups g
       join members m on m.code = $2::int
       left join group_members me
              on me.group_id = g.id and me.member_code = m.code and me.status = 'member'
      where g.id = $1::int`,
    [id, code],
  );
  return row?.is_member ? { group: toGroup(row), isAdmin: row.is_admin } : null;
}

export async function listGroupMembers(id: number): Promise<GroupMember[]> {
  const database = await db();
  const rows = await database.query<{
    code: number;
    full_name: string | null;
    city: string | null;
    title: MemberTitle;
    is_admin: boolean | null;
    status: "member" | "invited" | null;
  }>(
    `select m.code, m.full_name, m.city, m.title, gm.is_admin, gm.status
       from members m
       join groups g on g.id = $1::int
       left join group_members gm on gm.group_id = g.id and gm.member_code = m.code
      where m.status = 'active'
        and (gm.status is not null
             or (g.kind = 'official' and g.titles @> jsonb_build_array(m.title)))
      order by coalesce(gm.is_admin, false) desc, coalesce(gm.status = 'invited', false) asc, m.code`,
    [id],
  );
  return rows.map((r) => ({
    code: r.code,
    fullName: r.full_name,
    city: r.city,
    title: r.title,
    isAdmin: Boolean(r.is_admin),
    status: r.status === "invited" ? "invited" : "member",
    explicit: r.status !== null,
  }));
}

/**
 * Messages of a group. Without `after`: the latest 100. With `after`: everything newer.
 * A removed message keeps its place but its text is only returned when `showRemoved` is
 * set (the team sees what was removed).
 */
export async function listMessages(
  groupId: number,
  opts: { after?: number; showRemoved?: boolean } = {},
): Promise<GroupMessage[]> {
  const database = await db();
  const base = `select gm.id, gm.member_code, gm.staff_id, gm.body, gm.removed, gm.created_at,
                       m.full_name, s.name as staff_name
                  from group_messages gm
                  left join members m on m.code = gm.member_code
                  left join staff s on s.id = gm.staff_id
                 where gm.group_id = $1::int`;
  type Row = {
    id: number;
    member_code: number | null;
    staff_id: number | null;
    body: string;
    removed: boolean;
    created_at: Date;
    full_name: string | null;
    staff_name: string | null;
  };
  const rows =
    opts.after !== undefined
      ? await database.query<Row>(`${base} and gm.id > $2::int order by gm.id asc limit 200`, [
          groupId,
          opts.after,
        ])
      : (await database.query<Row>(`${base} order by gm.id desc limit 100`, [groupId])).reverse();

  return rows.map((r) => ({
    id: r.id,
    author: {
      fromStaff: r.staff_id !== null,
      code: r.member_code,
      name: r.staff_id !== null ? r.staff_name : r.full_name,
    },
    body: r.removed && !opts.showRemoved ? "" : r.body,
    removed: r.removed,
    createdAt: r.created_at,
  }));
}

/* --------------------------------- writing --------------------------------- */

export async function addMessage(
  groupId: number,
  from: { memberCode: number } | { staffId: number },
  body: string,
): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ id: number }>(
    `insert into group_messages (group_id, member_code, staff_id, body)
     values ($1::int, $2, $3, $4) returning id`,
    [
      groupId,
      "memberCode" in from ? from.memberCode : null,
      "staffId" in from ? from.staffId : null,
      body,
    ],
  );
  return row.id;
}

export async function markRead(groupId: number, code: number, upTo: number) {
  const database = await db();
  await database.query(
    `insert into group_reads (group_id, member_code, last_read_id) values ($1::int, $2::int, $3::int)
     on conflict (group_id, member_code)
     do update set last_read_id = greatest(group_reads.last_read_id, excluded.last_read_id)`,
    [groupId, code, upTo],
  );
}

export async function removeMessage(groupId: number, messageId: number) {
  const database = await db();
  await database.query(
    "update group_messages set removed = true where id = $1::int and group_id = $2::int",
    [messageId, groupId],
  );
}

/** Who wrote a message (so an author may remove their own). */
export async function messageAuthor(
  groupId: number,
  messageId: number,
): Promise<{ memberCode: number | null } | null> {
  const database = await db();
  const [row] = await database.query<{ member_code: number | null }>(
    "select member_code from group_messages where id = $1::int and group_id = $2::int",
    [messageId, groupId],
  );
  return row ? { memberCode: row.member_code } : null;
}

/** A member starts a group of friends and becomes its admin. null = too many already. */
export async function createFriendGroup(
  code: number,
  name: string,
  description: string | null,
): Promise<number | null> {
  const database = await db();
  return database.transaction(async (tx) => {
    const [{ n }] = await tx.query<{ n: number }>(
      `select count(*)::int as n from groups
        where kind = 'friends' and created_by_member = $1::int`,
      [code],
    );
    if (n >= MAX_FRIEND_GROUPS_PER_MEMBER) return null;
    const [group] = await tx.query<{ id: number }>(
      `insert into groups (name, description, kind, created_by_member)
       values ($1, $2, 'friends', $3::int) returning id`,
      [name, description, code],
    );
    await tx.query(
      `insert into group_members (group_id, member_code, status, is_admin)
       values ($1::int, $2::int, 'member', true)`,
      [group.id, code],
    );
    return group.id;
  });
}

export interface InviteResult {
  invited: number[];
  /** already in the group, or already invited */
  already: number[];
  /** no such member (or suspended) */
  unknown: number[];
  /** the group has no room for more */
  full: number[];
}

/** Invites members by code. They appear as "invited" until they accept. */
export async function inviteMembers(
  groupId: number,
  inviterCode: number,
  codes: number[],
): Promise<InviteResult> {
  const database = await db();
  return database.transaction(async (tx) => {
    const valid = await tx.query<{ code: number }>(
      `select code from members
        where status = 'active' and code in (select jsonb_array_elements_text($1::jsonb)::int)`,
      [JSON.stringify(codes)],
    );
    const validCodes = new Set(valid.map((r) => r.code));
    const unknown = codes.filter((c) => !validCodes.has(c));

    const existing = await tx.query<{ member_code: number }>(
      "select member_code from group_members where group_id = $1::int",
      [groupId],
    );
    const inGroup = new Set(existing.map((r) => r.member_code));
    const already = codes.filter((c) => validCodes.has(c) && inGroup.has(c));
    const fresh = codes.filter((c) => validCodes.has(c) && !inGroup.has(c));

    const room = Math.max(0, MAX_FRIEND_GROUP_SIZE - inGroup.size);
    const invited = fresh.slice(0, room);
    const full = fresh.slice(room);

    if (invited.length > 0) {
      await tx.query(
        `insert into group_members (group_id, member_code, status, invited_by)
         select $1::int, (jsonb_array_elements_text($2::jsonb))::int, 'invited', $3::int`,
        [groupId, JSON.stringify(invited), inviterCode],
      );
    }
    return { invited, already, unknown, full };
  });
}

/** An invited member answers. Accepting makes them a member; declining deletes the invitation. */
export async function answerInvitation(groupId: number, code: number, accept: boolean): Promise<boolean> {
  const database = await db();
  if (accept) {
    const rows = await database.query(
      `update group_members set status = 'member'
        where group_id = $1::int and member_code = $2::int and status = 'invited' returning group_id`,
      [groupId, code],
    );
    return rows.length > 0;
  }
  const rows = await database.query(
    `delete from group_members
      where group_id = $1::int and member_code = $2::int and status = 'invited' returning group_id`,
    [groupId, code],
  );
  return rows.length > 0;
}

/**
 * A member leaves a group of friends. If they were the only admin, the longest-standing member
 * takes over; if nobody is left, the group is deleted.
 */
export async function leaveGroup(groupId: number, code: number) {
  const database = await db();
  await database.transaction(async (tx) => {
    await tx.query("delete from group_members where group_id = $1::int and member_code = $2::int", [
      groupId,
      code,
    ]);
    const [{ n }] = await tx.query<{ n: number }>(
      "select count(*)::int as n from group_members where group_id = $1::int and status = 'member'",
      [groupId],
    );
    if (n === 0) {
      await tx.query("delete from groups where id = $1::int", [groupId]);
      return;
    }
    const [{ admins }] = await tx.query<{ admins: number }>(
      `select count(*)::int as admins from group_members
        where group_id = $1::int and status = 'member' and is_admin`,
      [groupId],
    );
    if (admins === 0) {
      await tx.query(
        `update group_members set is_admin = true
          where group_id = $1::int and member_code = (
            select member_code from group_members
             where group_id = $1::int and status = 'member'
             order by created_at, member_code limit 1)`,
        [groupId],
      );
    }
  });
}

export async function removeFromGroup(groupId: number, code: number) {
  const database = await db();
  await database.query("delete from group_members where group_id = $1::int and member_code = $2::int", [
    groupId,
    code,
  ]);
}

export async function renameGroup(groupId: number, name: string, description: string | null) {
  const database = await db();
  await database.query("update groups set name = $2, description = $3 where id = $1::int", [
    groupId,
    name,
    description,
  ]);
}

export async function deleteGroup(groupId: number) {
  const database = await db();
  await database.query("delete from groups where id = $1::int", [groupId]);
}

/* ---------------------------------- the team ---------------------------------- */

export interface GroupOverview extends GroupRow {
  memberCount: number;
  messageCount: number;
  lastAt: Date | null;
  /** who made it: a member number or a staff name */
  creatorCode: number | null;
  creatorStaff: string | null;
}

export async function listAllGroups(): Promise<GroupOverview[]> {
  const database = await db();
  const rows = await database.query<
    RawGroup & {
      member_count: number;
      message_count: number;
      last_at: Date | null;
      created_by_member: number | null;
      staff_name: string | null;
    }
  >(
    `select g.id, g.name, g.description, g.kind, g.titles, g.members_can_post, g.created_at,
            g.created_by_member, s.name as staff_name,
            ${MEMBER_COUNT} as member_count,
            (select count(*)::int from group_messages x where x.group_id = g.id and not x.removed) as message_count,
            (select max(x.created_at) from group_messages x where x.group_id = g.id) as last_at
       from groups g
       left join staff s on s.id = g.created_by_staff
      order by coalesce((select max(x.created_at) from group_messages x where x.group_id = g.id), g.created_at) desc`,
  );
  return rows.map((r) => ({
    ...toGroup(r),
    memberCount: r.member_count,
    messageCount: r.message_count,
    lastAt: r.last_at,
    creatorCode: r.created_by_member,
    creatorStaff: r.staff_name,
  }));
}

/** Members who exist and are active, among these codes. */
export async function activeCodes(codes: number[]): Promise<number[]> {
  if (codes.length === 0) return [];
  const database = await db();
  const rows = await database.query<{ code: number }>(
    `select code from members
      where status = 'active' and code in (select jsonb_array_elements_text($1::jsonb)::int)
      order by code`,
    [JSON.stringify(codes)],
  );
  return rows.map((r) => r.code);
}

/** The team makes a group: ranks that are in automatically, plus specific members. */
export async function createOfficialGroup(input: {
  name: string;
  description: string | null;
  titles: MemberTitle[];
  codes: number[];
  membersCanPost: boolean;
  staffId: number;
}): Promise<number> {
  const database = await db();
  return database.transaction(async (tx) => {
    const [group] = await tx.query<{ id: number }>(
      `insert into groups (name, description, kind, titles, members_can_post, created_by_staff)
       values ($1, $2, 'official', $3::jsonb, $4, $5::int) returning id`,
      [input.name, input.description, JSON.stringify(input.titles), input.membersCanPost, input.staffId],
    );
    if (input.codes.length > 0) {
      await tx.query(
        `insert into group_members (group_id, member_code, status)
         select $1::int, (jsonb_array_elements_text($2::jsonb))::int, 'member'
         on conflict do nothing`,
        [group.id, JSON.stringify(input.codes)],
      );
    }
    return group.id;
  });
}

/** Changes an official group: name, ranks, whether members may write. */
export async function updateOfficialGroup(
  groupId: number,
  input: { name: string; description: string | null; titles: MemberTitle[]; membersCanPost: boolean },
) {
  const database = await db();
  await database.query(
    `update groups set name = $2, description = $3, titles = $4::jsonb, members_can_post = $5
      where id = $1::int and kind = 'official'`,
    [groupId, input.name, input.description, JSON.stringify(input.titles), input.membersCanPost],
  );
}

/** The team adds members straight in (no invitation to accept). */
export async function addMembersDirectly(groupId: number, codes: number[]) {
  if (codes.length === 0) return;
  const database = await db();
  await database.query(
    `insert into group_members (group_id, member_code, status)
     select $1::int, (jsonb_array_elements_text($2::jsonb))::int, 'member'
     on conflict (group_id, member_code) do update set status = 'member'`,
    [groupId, JSON.stringify(codes)],
  );
}
