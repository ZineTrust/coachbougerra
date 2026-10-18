import "server-only";
import type { L10n, Video, VideoCategory } from "@/lib/data";
import { slugify } from "@/lib/slug";
import type { VideoSource } from "@/lib/video-source";
import { db } from "./db";

/*
  The formations. The team creates and edits them in the workspace; each one is a row of
  the `videos` table. The video itself is hosted on YouTube / Vimeo (we only keep which
  host and which video), and the optional cover image is a small JPEG kept in the database.
*/

interface Row {
  slug: string;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
  category: VideoCategory;
  duration_seconds: number;
  pv: number;
  provider: "youtube" | "vimeo" | null;
  ref: string | null;
  status: "draft" | "published";
  position: number;
  published_at: Date | null;
  views: number;
  cover_at: Date | null;
}

const SELECT = `select v.slug, v.title_fr, v.title_ar, v.description_fr, v.description_ar, v.category,
       v.duration_seconds, v.pv, v.provider, v.ref, v.status, v.position, v.published_at,
       (select count(*)::int from video_views w where w.slug = v.slug) as views,
       c.updated_at as cover_at
  from videos v left join video_covers c on c.slug = v.slug`;

const ORDER = "order by v.position asc, v.id asc";

/** A colour per formation, steady over time, used when there is no cover image. */
function hueFor(slug: string): number {
  let sum = 0;
  for (const ch of slug) sum = (sum * 31 + ch.charCodeAt(0)) % 360;
  return sum;
}

const both = (fr: string, ar: string): L10n => ({ fr: fr || ar, ar: ar || fr });

function toVideo(r: Row): Video {
  return {
    slug: r.slug,
    title: both(r.title_fr, r.title_ar),
    description: both(r.description_fr, r.description_ar),
    category: r.category,
    duration: r.duration_seconds,
    pv: r.pv,
    views: r.views,
    hue: hueFor(r.slug),
    status: r.status,
    daysAgo: r.published_at ? Math.max(0, Math.floor((Date.now() - r.published_at.getTime()) / 86_400_000)) : 0,
    hasVideo: Boolean(r.provider && r.ref),
    coverVersion: r.cover_at ? r.cover_at.getTime() : null,
  };
}

/* --------------------------------- reading --------------------------------- */

/** Every formation (drafts included), in the order the team set. */
export async function listVideos(): Promise<Video[]> {
  const database = await db();
  const rows = await database.query<Row>(`${SELECT} ${ORDER}`);
  return rows.map(toVideo);
}

/** Published formations only: what the public site shows. */
export async function listPublicVideos(): Promise<Video[]> {
  const database = await db();
  const rows = await database.query<Row>(`${SELECT} where v.status = 'published' ${ORDER}`);
  return rows.map(toVideo);
}

export async function getPublicVideoWithPv(slug: string): Promise<Video | undefined> {
  const database = await db();
  const [row] = await database.query<Row>(`${SELECT} where v.slug = $1 and v.status = 'published'`, [slug]);
  return row ? toVideo(row) : undefined;
}

/** Titles of every formation, even drafts and removed ones are simply missing (callers fall back to the slug). */
export async function videoTitles(): Promise<Map<string, L10n>> {
  const database = await db();
  const rows = await database.query<{ slug: string; title_fr: string; title_ar: string }>(
    "select slug, title_fr, title_ar from videos",
  );
  return new Map(rows.map((r) => [r.slug, both(r.title_fr, r.title_ar)]));
}

/** Where the video is, for a formation the caller already knows may be watched. */
export async function getVideoSource(slug: string): Promise<VideoSource | null> {
  const database = await db();
  const [row] = await database.query<{ provider: "youtube" | "vimeo" | null; ref: string | null }>(
    "select provider, ref from videos where slug = $1",
    [slug],
  );
  return row?.provider && row.ref ? { provider: row.provider, ref: row.ref } : null;
}

/** Everything the edit form needs. */
export interface VideoRecord {
  video: Video;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  source: VideoSource | null;
}

export async function getVideoRecord(slug: string): Promise<VideoRecord | null> {
  const database = await db();
  const [row] = await database.query<Row>(`${SELECT} where v.slug = $1`, [slug]);
  if (!row) return null;
  return {
    video: toVideo(row),
    titleFr: row.title_fr,
    titleAr: row.title_ar,
    descriptionFr: row.description_fr,
    descriptionAr: row.description_ar,
    source: row.provider && row.ref ? { provider: row.provider, ref: row.ref } : null,
  };
}

/* --------------------------------- writing --------------------------------- */

export interface VideoInput {
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  category: VideoCategory;
  durationSeconds: number;
  pv: number;
  source: VideoSource | null;
  status: "draft" | "published";
}

/** "nouvelle" is the page that creates a formation, so it can't also be a formation's address. */
const RESERVED_SLUGS = new Set(["nouvelle"]);

/** Creates a formation at the end of the list and returns its address (slug). */
export async function createVideo(input: VideoInput, staffId: number): Promise<string> {
  const database = await db();
  return database.transaction(async (tx) => {
    const base = slugify(input.titleFr || input.titleAr) || "formation";
    let slug = RESERVED_SLUGS.has(base) ? `${base}-2` : base;
    let n = 1;
    while ((await tx.query("select 1 from videos where slug = $1", [slug])).length > 0) {
      n += 1;
      slug = `${base}-${n}`;
    }
    const [{ next }] = await tx.query<{ next: number }>(
      "select (coalesce(max(position), 0) + 1)::int as next from videos",
    );
    await tx.query(
      `insert into videos (slug, title_fr, title_ar, description_fr, description_ar, category,
                           duration_seconds, pv, provider, ref, status, position, published_at, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
               case when $11 = 'published' then now() else null end, $13)`,
      [
        slug,
        input.titleFr,
        input.titleAr,
        input.descriptionFr,
        input.descriptionAr,
        input.category,
        input.durationSeconds,
        input.pv,
        input.source?.provider ?? null,
        input.source?.ref ?? null,
        input.status,
        next,
        staffId,
      ],
    );
    return slug;
  });
}

export async function updateVideo(slug: string, input: VideoInput): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `update videos
        set title_fr = $2, title_ar = $3, description_fr = $4, description_ar = $5, category = $6,
            duration_seconds = $7, pv = $8, provider = $9, ref = $10, status = $11,
            published_at = case when $11 = 'published' and published_at is null then now() else published_at end,
            updated_at = now()
      where slug = $1
      returning slug`,
    [
      slug,
      input.titleFr,
      input.titleAr,
      input.descriptionFr,
      input.descriptionAr,
      input.category,
      input.durationSeconds,
      input.pv,
      input.source?.provider ?? null,
      input.source?.ref ?? null,
      input.status,
    ],
  );
  return rows.length > 0;
}

export async function setVideoStatus(slug: string, status: "draft" | "published"): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `update videos
        set status = $2,
            published_at = case when $2 = 'published' and published_at is null then now() else published_at end,
            updated_at = now()
      where slug = $1 returning slug`,
    [slug, status],
  );
  return rows.length > 0;
}

export async function setVideoPv(slug: string, pv: number): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    "update videos set pv = $2, updated_at = now() where slug = $1 returning slug",
    [slug, pv],
  );
  return rows.length > 0;
}

/** Moves a formation one place up or down in the team's order (which is the members' order too). */
export async function moveVideo(slug: string, direction: "up" | "down") {
  const database = await db();
  await database.transaction(async (tx) => {
    const rows = await tx.query<{ slug: string }>("select slug from videos order by position asc, id asc");
    const order = rows.map((r) => r.slug);
    const i = order.indexOf(slug);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    // rewrite every position, so equal or gappy numbers can never get in the way
    await tx.query(
      `update videos v set position = o.pos
         from (select value as slug, (ordinality)::int as pos
                 from jsonb_array_elements_text($1::jsonb) with ordinality) o
        where v.slug = o.slug`,
      [JSON.stringify(order)],
    );
  });
}

export async function deleteVideo(slug: string): Promise<boolean> {
  const database = await db();
  const rows = await database.query("delete from videos where slug = $1 returning slug", [slug]);
  return rows.length > 0;
}

/** A member opened a formation they may watch. Counted once per member. */
export async function recordView(slug: string, code: number) {
  const database = await db();
  await database.query(
    "insert into video_views (slug, member_code) values ($1, $2::int) on conflict do nothing",
    [slug, code],
  );
}

/* ---------------------------------- covers ---------------------------------- */

export async function setCover(slug: string, base64: string) {
  const database = await db();
  await database.query(
    `insert into video_covers (slug, data_b64) values ($1, $2)
     on conflict (slug) do update set data_b64 = excluded.data_b64, updated_at = now()`,
    [slug, base64],
  );
}

export async function removeCover(slug: string) {
  const database = await db();
  await database.query("delete from video_covers where slug = $1", [slug]);
}

export async function getCover(
  slug: string,
): Promise<{ base64: string; updatedAt: Date; published: boolean } | null> {
  const database = await db();
  const [row] = await database.query<{ data_b64: string; updated_at: Date; status: string }>(
    `select c.data_b64, c.updated_at, v.status
       from video_covers c join videos v on v.slug = c.slug
      where c.slug = $1`,
    [slug],
  );
  return row ? { base64: row.data_b64, updatedAt: row.updated_at, published: row.status === "published" } : null;
}
