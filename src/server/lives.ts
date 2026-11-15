import "server-only";
import type { L10n, Live, LiveAccess, LiveStatus } from "@/lib/data";
import { db } from "./db";

/*
  The lives the team plans, one row per date. A live goes scheduled -> live (the room is open, the red
  banner shows on every page) -> ended, or is cancelled. Reservations (engagement.ts) point at a live by its
  id and its start time.
*/

interface Row {
  id: number;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
  host: string;
  access: LiveAccess;
  starts_at: Date;
  length_min: number;
  status: LiveStatus;
  started_at: Date | null;
  ended_at: Date | null;
  replay_slug: string | null;
}

const SELECT = `select id, title_fr, title_ar, description_fr, description_ar, host, access, starts_at,
       length_min, status, started_at, ended_at, replay_slug from lives`;

const both = (fr: string, ar: string): L10n => ({ fr: fr || ar, ar: ar || fr });

const toLive = (r: Row): Live => ({
  id: String(r.id),
  title: both(r.title_fr, r.title_ar),
  description: both(r.description_fr, r.description_ar),
  host: r.host,
  access: r.access,
  startsAt: r.starts_at,
  length: r.length_min,
  status: r.status,
  replaySlug: r.replay_slug,
  typed: {
    titleFr: r.title_fr,
    titleAr: r.title_ar,
    descriptionFr: r.description_fr,
    descriptionAr: r.description_ar,
  },
});

/** A live left "on air" for longer than this was forgotten open: it no longer counts as live. */
const FORGOTTEN_AFTER_HOURS = 12;

/** Still to come, or on air now. The first condition of every "coming up" list. */
const COMING_UP = `( (status = 'scheduled' and starts_at + length_min * interval '1 minute' > now())
                  or (status = 'live' and started_at > now() - make_interval(hours => ${FORGOTTEN_AFTER_HOURS})) )`;

const parseId = (id: string | number): number | null => {
  const n = typeof id === "number" ? id : /^\d{1,9}$/.test(id) ? Number(id) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** Lives still to come or on air, the one on air first, then by date. Team-only lives only on request. */
export async function upcomingLives(opts?: { includeTeam?: boolean; limit?: number }): Promise<Live[]> {
  const database = await db();
  const rows = await database.query<Row>(
    `${SELECT}
      where ${COMING_UP} and ($1::boolean or access <> 'team')
      order by (status = 'live') desc, starts_at asc
      limit $2::int`,
    [Boolean(opts?.includeTeam), opts?.limit ?? 50],
  );
  return rows.map(toLive);
}

/** The live whose room is open right now, if any. */
export async function liveOnAir(): Promise<(Live & { startedAt: Date }) | null> {
  const database = await db();
  const [row] = await database.query<Row>(
    `${SELECT}
      where status = 'live' and started_at > now() - make_interval(hours => ${FORGOTTEN_AFTER_HOURS})
      order by started_at desc limit 1`,
  );
  return row && row.started_at ? { ...toLive(row), startedAt: row.started_at } : null;
}

export async function getLive(id: string | number): Promise<Live | null> {
  const n = parseId(id);
  if (n === null) return null;
  const database = await db();
  const [row] = await database.query<Row>(`${SELECT} where id = $1::int`, [n]);
  return row ? toLive(row) : null;
}

/** Lives starting in a window (the calendar month), cancelled ones left out. */
export async function livesBetween(from: Date, to: Date, includeTeam = false): Promise<Live[]> {
  const database = await db();
  const rows = await database.query<Row>(
    `${SELECT}
      where status <> 'cancelled' and starts_at >= $1 and starts_at < $2 and ($3::boolean or access <> 'team')
      order by starts_at asc`,
    [from, to, includeTeam],
  );
  return rows.map(toLive);
}

/** What the workspace shows: lives to come or on air, and the most recent past ones. */
export async function workspaceLives(): Promise<{ current: Live[]; past: Live[] }> {
  const database = await db();
  const [current, past] = await Promise.all([
    upcomingLives({ includeTeam: true }),
    database.query<Row>(`${SELECT} where not ${COMING_UP} order by starts_at desc limit 30`),
  ]);
  return { current, past: past.map(toLive) };
}

/** Ended lives that have a recording to watch, newest first. */
export async function replays(limit = 6): Promise<Live[]> {
  const database = await db();
  const rows = await database.query<Row>(
    `${SELECT}
      where status = 'ended' and replay_slug is not null and access <> 'team'
      order by starts_at desc limit $1::int`,
    [limit],
  );
  return rows.map(toLive);
}

export interface LiveInput {
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  host: string;
  access: LiveAccess;
  startsAt: Date;
  length: number;
  replaySlug: string | null;
}

export async function createLive(input: LiveInput, staffId: number): Promise<string> {
  const database = await db();
  const [row] = await database.query<{ id: number }>(
    `insert into lives (title_fr, title_ar, description_fr, description_ar, host, access, starts_at,
                        length_min, replay_slug, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8::int, $9, $10::int) returning id`,
    [
      input.titleFr,
      input.titleAr,
      input.descriptionFr,
      input.descriptionAr,
      input.host,
      input.access,
      input.startsAt,
      input.length,
      input.replaySlug,
      staffId,
    ],
  );
  return String(row.id);
}

/** Changes a live. People who reserved a place keep it: their reservation follows the new time. */
export async function updateLive(id: string | number, input: LiveInput): Promise<boolean> {
  const n = parseId(id);
  if (n === null) return false;
  const database = await db();
  return database.transaction(async (tx) => {
    const [old] = await tx.query<{ starts_at: Date }>("select starts_at from lives where id = $1::int for update", [n]);
    if (!old) return false;
    await tx.query(
      `update lives set title_fr = $2, title_ar = $3, description_fr = $4, description_ar = $5, host = $6,
              access = $7, starts_at = $8, length_min = $9::int, replay_slug = $10, updated_at = now()
        where id = $1::int`,
      [
        n,
        input.titleFr,
        input.titleAr,
        input.descriptionFr,
        input.descriptionAr,
        input.host,
        input.access,
        input.startsAt,
        input.length,
        input.replaySlug,
      ],
    );
    if (old.starts_at.getTime() !== input.startsAt.getTime()) {
      await tx.query("update live_reservations set starts_at = $3 where live_id = $1 and starts_at = $2", [
        String(n),
        old.starts_at,
        input.startsAt,
      ]);
    }
    return true;
  });
}

/** Opens the live: the room is open and the banner shows. Only one live can be on air at a time. */
export async function startLive(id: string | number): Promise<"ok" | "missing" | "closed" | "other_on_air"> {
  const n = parseId(id);
  if (n === null) return "missing";
  const database = await db();
  return database.transaction(async (tx) => {
    const [row] = await tx.query<{ status: LiveStatus }>("select status from lives where id = $1::int for update", [n]);
    if (!row) return "missing";
    if (row.status === "cancelled") return "closed";
    const other = await tx.query(
      `select 1 from lives where status = 'live' and id <> $1::int
          and started_at > now() - make_interval(hours => ${FORGOTTEN_AFTER_HOURS})`,
      [n],
    );
    if (other.length > 0) return "other_on_air";
    // resuming a live that was already on air keeps its first start time
    await tx.query(
      `update lives set status = 'live', started_at = case when status = 'live' then started_at else now() end,
              ended_at = null, updated_at = now()
        where id = $1::int`,
      [n],
    );
    return "ok";
  });
}

export async function endLive(id: string | number): Promise<boolean> {
  const n = parseId(id);
  if (n === null) return false;
  const database = await db();
  const rows = await database.query(
    "update lives set status = 'ended', ended_at = now(), updated_at = now() where id = $1::int and status = 'live' returning id",
    [n],
  );
  return rows.length > 0;
}

export async function cancelLive(id: string | number): Promise<boolean> {
  const n = parseId(id);
  if (n === null) return false;
  const database = await db();
  const rows = await database.query(
    "update lives set status = 'cancelled', updated_at = now() where id = $1::int and status = 'scheduled' returning id",
    [n],
  );
  return rows.length > 0;
}

export async function deleteLive(id: string | number): Promise<boolean> {
  const n = parseId(id);
  if (n === null) return false;
  const database = await db();
  return database.transaction(async (tx) => {
    const rows = await tx.query("delete from lives where id = $1::int returning id", [n]);
    await tx.query("delete from live_reservations where live_id = $1", [String(n)]);
    return rows.length > 0;
  });
}

/* ----------------------------------- who came ----------------------------------- */

export async function recordAttendance(liveId: string | number, code: number) {
  const n = parseId(liveId);
  if (n === null) return;
  const database = await db();
  await database.query(
    "insert into live_attendance (live_id, member_code) values ($1::int, $2::int) on conflict do nothing",
    [n, code],
  );
}

/** How many different members entered each live's room. */
export async function attendanceCounts(ids: string[]): Promise<Map<string, number>> {
  const numbers = ids.map(parseId).filter((n): n is number => n !== null);
  if (numbers.length === 0) return new Map();
  const database = await db();
  const rows = await database.query<{ live_id: number; n: number }>(
    `select live_id, count(*)::int as n from live_attendance
      where live_id in (select jsonb_array_elements_text($1::jsonb)::int) group by live_id`,
    [JSON.stringify(numbers)],
  );
  return new Map(rows.map((r) => [String(r.live_id), r.n]));
}

/** The members who reserved a place at this live (to warn them when it starts). */
export async function reservedCodes(liveId: string, startsAt: Date): Promise<number[]> {
  const database = await db();
  const rows = await database.query<{ member_code: number }>(
    "select member_code from live_reservations where live_id = $1 and starts_at = $2 order by member_code",
    [liveId, startsAt],
  );
  return rows.map((r) => r.member_code);
}
