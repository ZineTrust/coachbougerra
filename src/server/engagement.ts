import "server-only";
import { POINTS, type MemberStats } from "@/lib/gamification";
import { db } from "./db";

/*
  Everything about how a member engages with the platform: profile photo,
  progress, reserved lives, the ranking, and which live is on air.
*/

/* ------------------------------ profile photo ------------------------------ */

/** The photo is a small JPEG kept as base64 text. */
export async function setAvatar(code: number, base64: string) {
  const database = await db();
  await database.query(
    `insert into member_avatars (member_code, data_b64) values ($1, $2)
     on conflict (member_code) do update set data_b64 = excluded.data_b64, updated_at = now()`,
    [code, base64],
  );
}

export async function getAvatar(code: number): Promise<{ base64: string; updatedAt: Date } | null> {
  const database = await db();
  const [row] = await database.query<{ data_b64: string; updated_at: Date }>(
    "select data_b64, updated_at from member_avatars where member_code = $1",
    [code],
  );
  return row ? { base64: row.data_b64, updatedAt: row.updated_at } : null;
}

export async function removeAvatar(code: number) {
  const database = await db();
  await database.query("delete from member_avatars where member_code = $1", [code]);
}

/** When the photo last changed (ms), or null if the member has none. Used to refresh cached images. */
export async function avatarVersion(code: number): Promise<number | null> {
  const database = await db();
  const [row] = await database.query<{ updated_at: Date }>(
    "select updated_at from member_avatars where member_code = $1",
    [code],
  );
  return row ? row.updated_at.getTime() : null;
}

/* --------------------------------- progress --------------------------------- */

export async function doneKeys(code: number): Promise<Set<string>> {
  const database = await db();
  const rows = await database.query<{ item_key: string }>(
    "select item_key from member_progress where member_code = $1",
    [code],
  );
  return new Set(rows.map((r) => r.item_key));
}

export async function setDone(code: number, key: string, done: boolean) {
  const database = await db();
  if (done) {
    await database.query(
      "insert into member_progress (member_code, item_key) values ($1, $2) on conflict do nothing",
      [code, key],
    );
  } else {
    await database.query("delete from member_progress where member_code = $1 and item_key = $2", [
      code,
      key,
    ]);
  }
}

/* -------------------------------- reservations -------------------------------- */

export const reservationKey = (liveId: string, startsAt: Date) => `${liveId}|${startsAt.toISOString()}`;

/** The member's upcoming reservations, as "liveId|startsAtISO" keys. */
export async function upcomingReservations(code: number): Promise<Set<string>> {
  const database = await db();
  const rows = await database.query<{ live_id: string; starts_at: Date }>(
    `select live_id, starts_at from live_reservations
      where member_code = $1 and starts_at > now() - interval '1 day'`,
    [code],
  );
  return new Set(rows.map((r) => reservationKey(r.live_id, r.starts_at)));
}

export const isReserved = (set: Set<string>, liveId: string, startsAt: Date) =>
  set.has(reservationKey(liveId, startsAt));

export async function setReservation(
  code: number,
  liveId: string,
  startsAt: Date,
  reserved: boolean,
) {
  const database = await db();
  if (reserved) {
    await database.query(
      `insert into live_reservations (member_code, live_id, starts_at) values ($1, $2, $3)
       on conflict do nothing`,
      [code, liveId, startsAt],
    );
  } else {
    await database.query(
      "delete from live_reservations where member_code = $1 and live_id = $2 and starts_at = $3",
      [code, liveId, startsAt],
    );
  }
}

/** How many people reserved a place at this occurrence. */
export async function reservationCounts(
  occurrences: { liveId: string; startsAt: Date }[],
): Promise<Map<string, number>> {
  if (occurrences.length === 0) return new Map();
  const database = await db();
  const rows = await database.query<{ live_id: string; starts_at: Date; n: number }>(
    `select r.live_id, r.starts_at, count(*)::int as n
       from live_reservations r
       join (select x->>'liveId' as live_id, (x->>'startsAt')::timestamptz as starts_at
               from jsonb_array_elements($1::jsonb) x) o
         on o.live_id = r.live_id and o.starts_at = r.starts_at
      group by r.live_id, r.starts_at`,
    [JSON.stringify(occurrences.map((o) => ({ liveId: o.liveId, startsAt: o.startsAt.toISOString() })))],
  );
  return new Map(rows.map((r) => [reservationKey(r.live_id, r.starts_at), r.n]));
}

/* ------------------------------- stats and ranking ------------------------------ */

export async function statsFor(code: number, profileComplete: boolean): Promise<MemberStats> {
  const database = await db();
  const [row] = await database.query<{ videos: number; scripts: number; reservations: number }>(
    `select
       (select count(*)::int from member_progress where member_code = $1 and item_key like 'video:%') as videos,
       (select count(*)::int from member_progress where member_code = $1 and item_key like 'toolbox:%') as scripts,
       (select count(*)::int from live_reservations where member_code = $1) as reservations`,
    [code],
  );
  return {
    profileComplete,
    videosDone: row?.videos ?? 0,
    scriptsUsed: row?.scripts ?? 0,
    reservations: row?.reservations ?? 0,
  };
}

export interface RankingEntry {
  code: number;
  fullName: string | null;
  city: string | null;
  hasAvatar: boolean;
  points: number;
}

/** Members who chose to appear in the ranking, best first. */
export async function ranking(limit = 100): Promise<RankingEntry[]> {
  const database = await db();
  const rows = await database.query<{
    code: number;
    full_name: string | null;
    city: string | null;
    has_avatar: boolean;
    points: number;
  }>(
    `select m.code, m.full_name, m.city,
            exists (select 1 from member_avatars a where a.member_code = m.code) as has_avatar,
            ( case when coalesce(trim(m.full_name), '') <> '' and coalesce(trim(m.city), '') <> ''
                   then $1::int else 0 end
              + $2::int * coalesce(p.videos, 0)
              + $3::int * coalesce(p.scripts, 0)
              + $4::int * coalesce(r.reservations, 0) ) as points
       from members m
       left join (select member_code,
                         (count(*) filter (where item_key like 'video:%'))::int as videos,
                         (count(*) filter (where item_key like 'toolbox:%'))::int as scripts
                    from member_progress group by member_code) p on p.member_code = m.code
       left join (select member_code, count(*)::int as reservations
                    from live_reservations group by member_code) r on r.member_code = m.code
      where m.show_in_ranking and m.status = 'active'
      order by points desc, m.code asc
      limit $5`,
    [POINTS.profile, POINTS.video, POINTS.script, POINTS.reservation, limit],
  );
  return rows.map((r) => ({
    code: r.code,
    fullName: r.full_name,
    city: r.city,
    hasAvatar: r.has_avatar,
    points: r.points,
  }));
}

/* ----------------------------------- live on air ---------------------------------- */

export async function getLiveNow(): Promise<{ liveId: string; startedAt: Date } | null> {
  const database = await db();
  const [row] = await database.query<{ live_id: string | null; started_at: Date | null }>(
    "select live_id, started_at from live_status where id = 1",
  );
  return row?.live_id && row.started_at ? { liveId: row.live_id, startedAt: row.started_at } : null;
}

/** liveId = null means "no live on air". */
export async function setLiveNow(liveId: string | null, staffId: number) {
  const database = await db();
  await database.query(
    `update live_status
        set live_id = $1,
            started_at = case when $1::text is null then null else now() end,
            started_by = case when $1::text is null then null else $2::int end
      where id = 1`,
    [liveId, staffId],
  );
}
