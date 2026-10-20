import "server-only";
import { db } from "./db";

/*
  The database side of uploaded videos: which upload is under way for a formation, which file
  a formation now plays, and what has to be cleaned up in the storage when that changes.
  (The storage itself is storage.ts.)
*/

export interface PendingUpload {
  slug: string;
  uploadId: string;
  key: string;
  fileName: string;
  bytes: number;
  lastModified: number;
  contentType: string;
}

interface PendingRow {
  slug: string;
  upload_id: string;
  object_key: string;
  file_name: string;
  file_bytes: number;
  last_modified: number;
  content_type: string;
}

const toPending = (r: PendingRow): PendingUpload => ({
  slug: r.slug,
  uploadId: r.upload_id,
  key: r.object_key,
  fileName: r.file_name,
  bytes: Number(r.file_bytes),
  lastModified: Number(r.last_modified),
  contentType: r.content_type,
});

const PENDING = `select slug, upload_id, object_key, file_name, file_bytes::double precision as file_bytes,
                        last_modified::double precision as last_modified, content_type
                   from video_uploads`;

export async function getPendingUpload(slug: string): Promise<PendingUpload | null> {
  const database = await db();
  const [row] = await database.query<PendingRow>(`${PENDING} where slug = $1`, [slug]);
  return row ? toPending(row) : null;
}

export async function savePendingUpload(p: PendingUpload) {
  const database = await db();
  await database.query(
    `insert into video_uploads (slug, upload_id, object_key, file_name, file_bytes, last_modified, content_type)
     values ($1, $2, $3, $4, $5::bigint, $6::bigint, $7)
     on conflict (slug) do update
       set upload_id = excluded.upload_id, object_key = excluded.object_key, file_name = excluded.file_name,
           file_bytes = excluded.file_bytes, last_modified = excluded.last_modified,
           content_type = excluded.content_type, created_at = now()`,
    [p.slug, p.uploadId, p.key, p.fileName, p.bytes, p.lastModified, p.contentType],
  );
}

export async function clearPendingUpload(slug: string) {
  const database = await db();
  await database.query("delete from video_uploads where slug = $1", [slug]);
}

/**
 * The finished file becomes the formation's video. Returns the key of the file it replaced
 * (to delete from the storage), or null. `seconds` is the length read from the file itself
 * (0 when the browser could not tell, which keeps the length already written).
 */
export async function attachFile(
  slug: string,
  key: string,
  bytes: number,
  seconds: number,
): Promise<{ attached: boolean; previousKey: string | null }> {
  const database = await db();
  return database.transaction(async (tx) => {
    const [before] = await tx.query<{ provider: string | null; ref: string | null }>(
      "select provider, ref from videos where slug = $1 for update",
      [slug],
    );
    if (!before) return { attached: false, previousKey: null };
    await tx.query(
      `update videos
          set provider = 'file', ref = $2, file_bytes = $3::bigint,
              duration_seconds = case when $4::int > 0 then $4::int else duration_seconds end,
              updated_at = now()
        where slug = $1`,
      [slug, key, bytes, seconds],
    );
    await tx.query("delete from video_uploads where slug = $1", [slug]);
    const previousKey = before.provider === "file" && before.ref && before.ref !== key ? before.ref : null;
    return { attached: true, previousKey };
  });
}

/** Takes the video off a formation (link or file). Returns the key of the file it was, if it was one. */
export async function detachVideo(slug: string): Promise<{ found: boolean; previousKey: string | null }> {
  const database = await db();
  return database.transaction(async (tx) => {
    const [before] = await tx.query<{ provider: string | null; ref: string | null }>(
      "select provider, ref from videos where slug = $1 for update",
      [slug],
    );
    if (!before) return { found: false, previousKey: null };
    await tx.query(
      "update videos set provider = null, ref = null, file_bytes = null, updated_at = now() where slug = $1",
      [slug],
    );
    return { found: true, previousKey: before.provider === "file" ? before.ref : null };
  });
}

/** What to throw away from the storage before a formation is deleted. */
export async function storageLeftBy(slug: string): Promise<{ fileKey: string | null; pending: PendingUpload | null }> {
  const database = await db();
  const [row] = await database.query<{ provider: string | null; ref: string | null }>(
    "select provider, ref from videos where slug = $1",
    [slug],
  );
  return {
    fileKey: row?.provider === "file" ? row.ref : null,
    pending: await getPendingUpload(slug),
  };
}

/** Total size of the uploaded videos, to show how full the storage is. */
export async function storageUsedBytes(): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ total: number }>(
    "select coalesce(sum(file_bytes), 0)::double precision as total from videos where provider = 'file'",
  );
  return Number(row?.total ?? 0);
}
