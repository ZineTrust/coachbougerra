// One-time setup of the video bucket: lets the website's pages send video pieces straight to it.
//
//   node --env-file=.env.local scripts/storage-cors.mjs https://your-site.onrender.com [another origin…]
//
// Reads STORAGE_ENDPOINT and STORAGE_BUCKET, plus a key allowed to change the bucket's settings:
// STORAGE_ADMIN_KEY_ID / STORAGE_ADMIN_KEY_SECRET if present (for Backblaze B2 that is the account's
// master application key, which you can remove from .env.local again afterwards), otherwise
// STORAGE_KEY_ID / STORAGE_KEY_SECRET. It replaces the bucket's CORS rules with one rule for the
// origins given.
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.STORAGE_ENDPOINT?.trim().replace(/\/+$/, "");
const bucket = process.env.STORAGE_BUCKET?.trim();
const accessKeyId = (process.env.STORAGE_ADMIN_KEY_ID || process.env.STORAGE_KEY_ID)?.trim();
const secretAccessKey = (process.env.STORAGE_ADMIN_KEY_SECRET || process.env.STORAGE_KEY_SECRET)?.trim();

const origins = process.argv.slice(2).map((value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("not http(s)");
    return url.origin;
  } catch {
    console.error(`"${value}" is not a web address like https://your-site.onrender.com`);
    process.exit(1);
  }
});

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing settings: STORAGE_ENDPOINT, STORAGE_BUCKET and a key (STORAGE_KEY_ID / STORAGE_KEY_SECRET).");
  process.exit(1);
}
if (origins.length === 0) {
  console.error("Give the website's address, e.g.  node --env-file=.env.local scripts/storage-cors.mjs https://your-site.onrender.com");
  process.exit(1);
}

const region = process.env.STORAGE_REGION?.trim() || /^https?:\/\/s3\.([^.]+)\./.exec(endpoint)?.[1] || "us-east-1";
const client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const rules = {
  CORSRules: [
    {
      ID: "website-uploads",
      AllowedOrigins: origins,
      // PUT sends a piece, GET/HEAD let the player read the video
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

/**
 * The SDK's default adds a CRC32 checksum header. If the storage refuses it, the second try uses the
 * classic Content-MD5 instead (and drops the SDK's own marker header, which only AWS understands).
 */
async function putRules(classic) {
  if (!classic) return client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: rules }));
  const plain = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  // must run just before the request is signed, otherwise the header would be signed and then missing
  plain.middlewareStack.addRelativeTo(
    (next) => async (args) => {
      delete args.request.headers["x-amz-sdk-checksum-algorithm"];
      return next(args);
    },
    { step: "finalizeRequest", relation: "before", toMiddleware: "httpSigningMiddleware", name: "dropSdkChecksumMarker" },
  );
  return plain.send(new PutBucketCorsCommand({ Bucket: bucket, ChecksumAlgorithm: "MD5", CORSConfiguration: rules }));
}

try {
  try {
    await putRules(false);
  } catch (first) {
    console.log(`First try refused (${first.name}: ${first.message}); trying again with a classic Content-MD5…`);
    await putRules(true);
  }
  const saved = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log(`CORS rule saved on "${bucket}" for: ${origins.join(", ")}`);
  console.log(JSON.stringify(saved.CORSRules, null, 2));
} catch (error) {
  console.error(`Could not set the CORS rule: ${error.name}: ${error.message}`);
  if (/AccessDenied|Unauthorized|not entitled|capabilit/i.test(`${error.name} ${error.message}`)) {
    console.error("This key may not be allowed to change bucket settings: use the account's master application key (STORAGE_ADMIN_KEY_ID / STORAGE_ADMIN_KEY_SECRET).");
  }
  process.exit(1);
}
