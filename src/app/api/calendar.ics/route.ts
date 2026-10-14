import { NextResponse, type NextRequest } from "next/server";
import { LIVES } from "@/lib/data";
import { buildIcs, type IcsEvent } from "@/lib/calendar";
import { nextOccurrence } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Calendar file for the public lives.
 *   /api/calendar.ics                      -> subscribe once, every weekly live stays up to date
 *   /api/calendar.ics?live=<id>            -> one live, repeating weekly (downloads)
 *   /api/calendar.ics?live=<id>&once=1     -> only its next date (downloads)
 *   add &lang=ar for Arabic titles
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lang = params.get("lang") === "ar" ? "ar" : "fr";
  const only = params.get("live");
  const once = params.get("once") === "1";

  const lives = LIVES.filter((l) => l.access !== "team" && (!only || l.id === only));
  if (only && lives.length === 0) return new NextResponse("Not found", { status: 404 });

  // behind the host's proxy the request URL says "localhost:10000": the real address is in the forwarded headers
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  const proto = first(request.headers.get("x-forwarded-proto")) ?? request.nextUrl.protocol.replace(":", "");
  const host = first(request.headers.get("x-forwarded-host")) ?? first(request.headers.get("host")) ?? request.nextUrl.host;
  const origin = `${proto}://${host}`;
  const events: IcsEvent[] = lives.map((l) => ({
    uid: `${l.id}@coach-bougerra`,
    title: `${l.title[lang]} — Coach Bougerra`,
    description: l.description[lang],
    startsAt: nextOccurrence(l.slot),
    minutes: l.length,
    weekly: !once,
    url: `${origin}/${lang}/lives`,
  }));

  const body = buildIcs(events, "Coach Bougerra");
  const headers: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=900",
  };
  // a single live is downloaded and opened by the calendar app; the feed is read in place
  if (only) headers["Content-Disposition"] = `attachment; filename="${only}.ics"`;

  return new NextResponse(body, { headers });
}
