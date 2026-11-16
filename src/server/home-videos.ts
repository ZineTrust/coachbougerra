import "server-only";
import type { VideoProvider, VideoSource } from "@/lib/video-source";
import { showreelEmbedUrl } from "@/lib/video-source";
import { db } from "./db";
import { signPublic, storageConfigured } from "./storage";

/*
  The videos that play at the top of the home page, chosen by the team in the workspace. A video is either a
  link (YouTube / Vimeo) or a short file sent to our own storage. They play one after the other, in the order
  of `position`; a video that is switched off stays in the list but is not shown.
*/

/** The biggest home video accepted, in bytes (it plays on every phone: keep it short and light). */
export const HOME_VIDEO_MAX_BYTES = (Number(process.env.HOME_VIDEO_MAX_MB) || 120) * 1024 * 1024;
/** How many videos the home page can hold (more would only be a long wait). */
export const HOME_VIDEOS_MAX = 8;

export interface HomeVideo {
  id: number;
  provider: VideoProvider;
  /** a link's video id, or the file's key in the storage */
  ref: string;
  bytes: number | null;
  active: boolean;
  position: number;
}

interface Row {
  id: number;
  provider: VideoProvider;
  ref: string;
  file_bytes: number | null;
  active: boolean;
  position: number;
}

const toVideo = (r: Row): HomeVideo => ({
  id: r.id,
  provider: r.provider,
  ref: r.ref,
  bytes: r.file_bytes === null ? null : Number(r.file_bytes),
  active: r.active,
  position: r.position,
});

const SELECT = "select id, provider, ref, file_bytes::double precision as file_bytes, active, position from home_videos";

/** Every video, for the team's list. */
export async function listHomeVideos(): Promise<HomeVideo[]> {
  const database = await db();
  const rows = await database.query<Row>(`${SELECT} order by position, id`);
  return rows.map(toVideo);
}

/** What the page needs to play one video: a file's signed address, or a player's address. */
export interface ShowreelItem {
  id: number;
  kind: "file" | "embed";
  src: string;
}

/** The videos to show on the home page, in order (nothing when there are none or the storage is off). */
export async function showreel(): Promise<ShowreelItem[]> {
  const database = await db();
  const rows = await database.query<Row>(`${SELECT} where active order by position, id`);
  const items: ShowreelItem[] = [];
  for (const row of rows) {
    try {
      if (row.provider === "file") {
        if (!storageConfigured()) continue;
        items.push({ id: row.id, kind: "file", src: await signPublic(row.ref) });
      } else {
        items.push({ id: row.id, kind: "embed", src: showreelEmbedUrl({ provider: row.provider, ref: row.ref }) });
      }
    } catch (error) {
      // one broken video must not take the home page down
      console.error("[home-videos] could not prepare a video:", error);
    }
  }
  return items;
}

/** Adds a video at the end of the list. Returns its id. */
export async function addHomeVideo(source: VideoSource, bytes: number | null): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ id: number }>(
    `insert into home_videos (position, provider, ref, file_bytes)
     values ((select coalesce(max(position), 0) + 1 from home_videos), $1, $2, $3::bigint) returning id`,
    [source.provider, source.ref, bytes],
  );
  return row.id;
}

export async function setHomeVideoActive(id: number, active: boolean): Promise<boolean> {
  const database = await db();
  const rows = await database.query("update home_videos set active = $2 where id = $1::int returning id", [id, active]);
  return rows.length > 0;
}

/** Moves a video one place up (-1) or down (+1) in the list. */
export async function moveHomeVideo(id: number, direction: -1 | 1): Promise<boolean> {
  const database = await db();
  return database.transaction(async (tx) => {
    const all = await tx.query<{ id: number }>("select id from home_videos order by position, id for update");
    const at = all.findIndex((r) => r.id === id);
    const to = at + direction;
    if (at < 0 || to < 0 || to >= all.length) return false;
    const order = all.map((r) => r.id);
    [order[at], order[to]] = [order[to], order[at]];
    // positions are rewritten 1..n so they never drift or collide
    for (let i = 0; i < order.length; i += 1) {
      await tx.query("update home_videos set position = $2::int where id = $1::int", [order[i], i + 1]);
    }
    return true;
  });
}

/** Removes a video. Returns the key of the file to delete from the storage (null for a link or when unknown). */
export async function deleteHomeVideo(id: number): Promise<{ found: boolean; fileKey: string | null }> {
  const database = await db();
  const [row] = await database.query<{ provider: VideoProvider; ref: string }>(
    "delete from home_videos where id = $1::int returning provider, ref",
    [id],
  );
  return { found: Boolean(row), fileKey: row?.provider === "file" ? row.ref : null };
}

/** True when a file key is already used by a video of the list. */
export async function homeFileKnown(key: string): Promise<boolean> {
  const database = await db();
  const rows = await database.query("select 1 from home_videos where provider = 'file' and ref = $1", [key]);
  return rows.length > 0;
}
