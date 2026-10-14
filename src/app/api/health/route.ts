import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Used by the host (Render) to know the site is up. Deliberately does not touch the database. */
export function GET() {
  return NextResponse.json({ ok: true });
}
