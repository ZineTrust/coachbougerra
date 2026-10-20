import "server-only";
import { headers } from "next/headers";

/**
 * The address people use to reach the site ("https://coach-bougerra.onrender.com"), for links that
 * leave it (an invitation link, its QR code). `SITE_URL` wins when set (a custom domain), otherwise it
 * is read from the request.
 */
export async function siteOrigin(): Promise<string> {
  const fixed = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;

  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const local = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = (h.get("x-forwarded-proto") ?? (local ? "http" : "https")).split(",")[0].trim();
  return `${proto}://${host}`;
}
