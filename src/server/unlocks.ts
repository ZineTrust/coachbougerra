import "server-only";
import { hasVideoAccess, type MemberTitle } from "@/lib/permissions";
import { monthKey, type UnlockStatus, type UnlockView } from "@/lib/unlock";
import { db } from "./db";
import { getGrants } from "./members";

/*
  Requests to unlock a formation with PV. A member says how much PV they earned
  on Ultimate this month; staff check it on the member's Ultimate account and
  approve or refuse. An approval only counts during its own month.
*/

export interface UnlockRequest {
  id: number;
  memberCode: number;
  videoSlug: string;
  pvClaimed: number;
  pvRequired: number;
  note: string | null;
  locale: "fr" | "ar";
  /** "YYYY-MM", Algiers time */
  month: string;
  status: UnlockView;
  createdAt: Date;
  decidedAt: Date | null;
  decisionNote: string | null;
  decidedBy: string | null;
}

export interface RequestWithMember extends UnlockRequest {
  member: {
    code: number;
    fullName: string | null;
    city: string | null;
    title: MemberTitle;
    ultimateCode: string;
    email: string;
    phone: string;
  };
  /** the most PV already checked for this member this month (0 if none) */
  verifiedPv: number;
}

interface Row {
  id: number;
  member_code: number;
  video_slug: string;
  pv_claimed: number;
  pv_required: number;
  note: string | null;
  locale: string;
  month: string;
  status: UnlockStatus;
  created_at: Date;
  decided_at: Date | null;
  decision_note: string | null;
  decided_by_name: string | null;
}

const SELECT = `r.id, r.member_code, r.video_slug, r.pv_claimed, r.pv_required, r.note, r.locale,
  r.month, r.status, r.created_at, r.decided_at, r.decision_note, s.name as decided_by_name`;
const FROM = "unlock_requests r left join staff s on s.id = r.decided_by";

function toRequest(r: Row, current: string): UnlockRequest {
  return {
    id: r.id,
    memberCode: r.member_code,
    videoSlug: r.video_slug,
    pvClaimed: r.pv_claimed,
    pvRequired: r.pv_required,
    note: r.note,
    locale: r.locale === "ar" ? "ar" : "fr",
    month: r.month,
    // asked in an earlier month and never answered: too old to approve
    status: r.status === "pending" && r.month !== current ? "expired" : r.status,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
    decisionNote: r.decision_note,
    decidedBy: r.decided_by_name,
  };
}

/* ------------------------------- the member side ------------------------------- */

/** Everything this member asked for this month, newest first. */
export async function requestsThisMonth(code: number): Promise<UnlockRequest[]> {
  const database = await db();
  const current = monthKey();
  const rows = await database.query<Row>(
    `select ${SELECT} from ${FROM}
      where r.member_code = $1 and r.month = $2
      order by r.created_at desc, r.id desc`,
    [code, current],
  );
  return rows.map((r) => toRequest(r, current));
}

/** Formations unlocked for this member by an approval this month. */
export async function unlockedSlugs(code: number): Promise<Set<string>> {
  const database = await db();
  const rows = await database.query<{ video_slug: string }>(
    `select distinct video_slug from unlock_requests
      where member_code = $1 and month = $2 and status = 'approved'`,
    [code, monthKey()],
  );
  return new Set(rows.map((r) => r.video_slug));
}

/**
 * Can this member watch a formation that needs PV? Yes with a gift from staff
 * (never expires) or an approval from this month.
 */
export async function videoAccessFor(code: number): Promise<(slug: string) => boolean> {
  const [grants, unlocked] = await Promise.all([getGrants(code), unlockedSlugs(code)]);
  return (slug) => hasVideoAccess(grants, slug) || unlocked.has(slug);
}

export async function createRequest(input: {
  memberCode: number;
  videoSlug: string;
  pvClaimed: number;
  pvRequired: number;
  note: string | null;
  locale: "fr" | "ar";
}): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `insert into unlock_requests (member_code, video_slug, pv_claimed, pv_required, note, locale, month)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (member_code, video_slug, month) where status = 'pending' do nothing
     returning id`,
    [
      input.memberCode,
      input.videoSlug,
      input.pvClaimed,
      input.pvRequired,
      input.note,
      input.locale,
      monthKey(),
    ],
  );
  return rows.length > 0;
}

/* ------------------------------- the staff side ------------------------------- */

interface MemberJoin {
  m_code: number;
  m_full_name: string | null;
  m_city: string | null;
  m_title: MemberTitle;
  m_ultimate_code: string;
  m_email: string;
  m_phone: string;
  verified_pv: number;
}

const WITH_MEMBER = `${SELECT},
  m.code as m_code, m.full_name as m_full_name, m.city as m_city, m.title as m_title,
  m.ultimate_code as m_ultimate_code, m.email as m_email, m.phone as m_phone,
  (select coalesce(max(a.pv_claimed), 0)::int from unlock_requests a
    where a.member_code = r.member_code and a.month = r.month and a.status = 'approved') as verified_pv`;

function withMember(r: Row & MemberJoin, current: string): RequestWithMember {
  return {
    ...toRequest(r, current),
    member: {
      code: r.m_code,
      fullName: r.m_full_name,
      city: r.m_city,
      title: r.m_title,
      ultimateCode: r.m_ultimate_code,
      email: r.m_email,
      phone: r.m_phone,
    },
    verifiedPv: r.verified_pv,
  };
}

/** Requests waiting for a decision (this month's only), oldest first. */
export async function listPending(): Promise<RequestWithMember[]> {
  const database = await db();
  const current = monthKey();
  const rows = await database.query<Row & MemberJoin>(
    `select ${WITH_MEMBER} from ${FROM} join members m on m.code = r.member_code
      where r.status = 'pending' and r.month = $1
      order by r.created_at asc, r.id asc`,
    [current],
  );
  return rows.map((r) => withMember(r, current));
}

/** Answered requests (and ones that ran out with their month), newest first. */
export async function listDecided(limit = 60): Promise<RequestWithMember[]> {
  const database = await db();
  const current = monthKey();
  const rows = await database.query<Row & MemberJoin>(
    `select ${WITH_MEMBER} from ${FROM} join members m on m.code = r.member_code
      where r.status <> 'pending' or r.month <> $1
      order by coalesce(r.decided_at, r.created_at) desc, r.id desc
      limit $2`,
    [current, limit],
  );
  return rows.map((r) => withMember(r, current));
}

export async function pendingCount(): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    "select count(*)::int as n from unlock_requests where status = 'pending' and month = $1",
    [monthKey()],
  );
  return row?.n ?? 0;
}

export async function getRequest(id: number): Promise<UnlockRequest | null> {
  const database = await db();
  const current = monthKey();
  const [row] = await database.query<Row>(`select ${SELECT} from ${FROM} where r.id = $1`, [id]);
  return row ? toRequest(row, current) : null;
}

/**
 * Answers a pending request of this month. Returns the request as it now is, or
 * null if it was already answered (two staff clicking at once) or its month is over.
 */
export async function decideRequest(
  id: number,
  staffId: number,
  decision: "approved" | "rejected",
  note: string | null,
): Promise<UnlockRequest | null> {
  const database = await db();
  const rows = await database.query<{ id: number }>(
    `update unlock_requests
        set status = $2, decided_by = $3, decided_at = now(), decision_note = $4
      where id = $1 and status = 'pending' and month = $5
      returning id`,
    [id, decision, staffId, note, monthKey()],
  );
  return rows.length > 0 ? getRequest(id) : null;
}

/** Takes back an approval of this month (the member loses the unlock at once). */
export async function revokeRequest(id: number, staffId: number): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `update unlock_requests
        set status = 'revoked', decided_by = $2, decided_at = now()
      where id = $1 and status = 'approved' and month = $3
      returning id`,
    [id, staffId, monthKey()],
  );
  return rows.length > 0;
}

/** A member's approvals for this month, for the member page in the workspace. */
export async function approvedThisMonth(code: number): Promise<UnlockRequest[]> {
  return (await requestsThisMonth(code)).filter((r) => r.status === "approved");
}
