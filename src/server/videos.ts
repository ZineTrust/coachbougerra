import "server-only";
import { VIDEOS, type Video } from "@/lib/data";
import type { VideoSource } from "@/lib/video-source";
import { db } from "./db";

/*
  The formations themselves are still sample data (lib/data.ts), but how much PV
  each one needs is a setting staff can change, so it lives in the database. A
  formation without a saved value uses the default from lib/data.ts.
*/

async function overrides(): Promise<Map<string, number>> {
  const database = await db();
  const rows = await database.query<{ slug: string; pv: number }>("select slug, pv from video_pv");
  return new Map(rows.map((r) => [r.slug, r.pv]));
}

const withPv = (videos: Video[], saved: Map<string, number>): Video[] =>
  videos.map((v) => (saved.has(v.slug) ? { ...v, pv: saved.get(v.slug)! } : v));

/** Every formation (drafts included) with the PV requirement currently in force. */
export async function listVideos(): Promise<Video[]> {
  return withPv(VIDEOS, await overrides());
}

/** Published formations only: what the public site shows. */
export async function listPublicVideos(): Promise<Video[]> {
  return (await listVideos()).filter((v) => v.status === "published");
}

export async function getPublicVideoWithPv(slug: string): Promise<Video | undefined> {
  return (await listPublicVideos()).find((v) => v.slug === slug);
}

/* ------------------------------ where the video is ------------------------------ */

type SourceRow = { slug: string; provider: "youtube" | "vimeo"; ref: string };

export async function getVideoSource(slug: string): Promise<VideoSource | null> {
  const database = await db();
  const [row] = await database.query<SourceRow>(
    "select slug, provider, ref from video_sources where slug = $1",
    [slug],
  );
  return row ? { provider: row.provider, ref: row.ref } : null;
}

export async function listVideoSources(): Promise<Map<string, VideoSource>> {
  const database = await db();
  const rows = await database.query<SourceRow>("select slug, provider, ref from video_sources");
  return new Map(rows.map((r) => [r.slug, { provider: r.provider, ref: r.ref }]));
}

/** source = null removes the video from this formation. */
export async function setVideoSource(slug: string, source: VideoSource | null, staffId: number) {
  const database = await db();
  if (!source) {
    await database.query("delete from video_sources where slug = $1", [slug]);
    return;
  }
  await database.query(
    `insert into video_sources (slug, provider, ref, updated_by) values ($1, $2, $3, $4)
     on conflict (slug) do update
       set provider = excluded.provider, ref = excluded.ref,
           updated_by = excluded.updated_by, updated_at = now()`,
    [slug, source.provider, source.ref, staffId],
  );
}

export async function setVideoPv(slug: string, pv: number, staffId: number) {
  const database = await db();
  await database.query(
    `insert into video_pv (slug, pv, updated_by) values ($1, $2, $3)
     on conflict (slug) do update
       set pv = excluded.pv, updated_by = excluded.updated_by, updated_at = now()`,
    [slug, pv, staffId],
  );
}
