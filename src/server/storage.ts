import "server-only";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/*
  Where the videos uploaded from a phone are kept: any S3-compatible storage (Backblaze B2 is
  the one this was made for; Cloudflare R2, Wasabi, MinIO… work with the same settings).

  The phone sends the file straight to the storage, in pieces ("multipart upload") through
  short-lived signed addresses we hand out, so the website itself never carries the video and a
  dropped connection only costs one piece. Members watch through signed addresses too: the
  bucket is private and an address only exists for someone who may watch, and it expires.

  Settings (environment): STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_KEY_ID, STORAGE_KEY_SECRET;
  optional STORAGE_REGION (read from a B2 endpoint when missing), VIDEO_MAX_MB (default 2048),
  STORAGE_PART_MB (default 16), STORAGE_QUOTA_GB (only shown to the team, default 10).
*/

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const MB = 1024 * 1024;
const MIN_PART = 5 * MB; // the smallest piece S3 accepts (except the last one)
const MAX_PARTS = 9000; // S3 allows 10 000

/** Largest video accepted, in bytes. */
export const MAX_VIDEO_BYTES = (Number(process.env.VIDEO_MAX_MB) || 2048) * MB;
/** What the free storage plan holds, in bytes: only used to show how full it is. */
export const STORAGE_QUOTA_BYTES = (Number(process.env.STORAGE_QUOTA_GB) || 10) * 1024 * MB;

function readConfig(): StorageConfig | null {
  const endpoint = process.env.STORAGE_ENDPOINT?.trim().replace(/\/+$/, "");
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const accessKeyId = process.env.STORAGE_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_KEY_SECRET?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  // https://s3.eu-central-003.backblazeb2.com -> eu-central-003
  const region = process.env.STORAGE_REGION?.trim() || /^https?:\/\/s3\.([^.]+)\./.exec(endpoint)?.[1] || "us-east-1";
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

/** True when the storage settings are all there (uploads are offered only then). */
export function storageConfigured(): boolean {
  return readConfig() !== null;
}

const globalForStorage = globalThis as unknown as { __coachBougerraS3?: { key: string; client: S3Client } };

function connect(): { client: S3Client; bucket: string } {
  const config = readConfig();
  if (!config) throw new Error("The video storage is not set up (STORAGE_* settings).");
  const key = JSON.stringify(config);
  if (globalForStorage.__coachBougerraS3?.key !== key) {
    globalForStorage.__coachBougerraS3 = {
      key,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        // address style "https://endpoint/bucket/key": works everywhere, B2 included
        forcePathStyle: true,
        // the SDK's newer default adds checksum headers that Backblaze and other S3 look-alikes reject
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }
  return { client: globalForStorage.__coachBougerraS3.client, bucket: config.bucket };
}

/* ------------------------------ sending a file ------------------------------ */

/** The size of each piece for a file of `size` bytes (the same answer every time, so an upload can resume). */
export function partSizeFor(size: number): number {
  const wanted = Math.max(MIN_PART, (Number(process.env.STORAGE_PART_MB) || 16) * MB);
  return Math.max(wanted, Math.ceil(size / MAX_PARTS));
}

export const partCountFor = (size: number) => Math.max(1, Math.ceil(size / partSizeFor(size)));

/** Expected size of piece `n` (1-based) of a file of `size` bytes. */
export function partBytes(size: number, n: number): number {
  const part = partSizeFor(size);
  return Math.min(part, size - (n - 1) * part);
}

export async function startMultipart(key: string, contentType: string): Promise<string> {
  const { client, bucket } = connect();
  const result = await client.send(
    new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
  );
  if (!result.UploadId) throw new Error("The storage did not return an upload id.");
  return result.UploadId;
}

/** A signed address the browser can PUT one piece to (valid for 6 hours). */
export async function signPart(key: string, uploadId: string, partNumber: number): Promise<string> {
  const { client, bucket } = connect();
  return getSignedUrl(
    client,
    new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: 6 * 3600 },
  );
}

export interface StoredPart {
  number: number;
  etag: string;
  size: number;
}

/** The pieces the storage has received so far. */
export async function listParts(key: string, uploadId: string): Promise<StoredPart[]> {
  const { client, bucket } = connect();
  const parts: StoredPart[] = [];
  let marker: string | undefined;
  for (;;) {
    const page = await client.send(
      new ListPartsCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumberMarker: marker, MaxParts: 1000 }),
    );
    for (const p of page.Parts ?? []) {
      if (p.PartNumber && p.ETag) parts.push({ number: p.PartNumber, etag: p.ETag, size: Number(p.Size ?? 0) });
    }
    if (!page.IsTruncated || !page.NextPartNumberMarker) break;
    marker = page.NextPartNumberMarker;
  }
  return parts.sort((a, b) => a.number - b.number);
}

export async function finishMultipart(key: string, uploadId: string, parts: StoredPart[]) {
  const { client, bucket } = connect();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.number, ETag: p.etag })) },
    }),
  );
}

/** Throws away an unfinished upload (never fails: it is only clean-up). */
export async function abortMultipart(key: string, uploadId: string) {
  try {
    const { client, bucket } = connect();
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }));
  } catch (error) {
    console.warn("[storage] could not abort an unfinished upload:", (error as Error).message);
  }
}

/** The size of a stored file, or null when it is not there. */
export async function fileSize(key: string): Promise<number | null> {
  try {
    const { client, bucket } = connect();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return Number(head.ContentLength ?? 0);
  } catch {
    return null;
  }
}

export async function deleteFile(key: string) {
  try {
    const { client, bucket } = connect();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.warn("[storage] could not delete a file:", (error as Error).message);
  }
}

/* -------------------------------- watching -------------------------------- */

/** How long a viewing address works. The player asks for a new one when it runs out. */
export const WATCH_SECONDS = 2 * 3600;

/** A signed address of the video for the player (the caller has checked the viewer may watch). */
export async function signWatch(key: string): Promise<string> {
  const { client, bucket } = connect();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: WATCH_SECONDS });
}
