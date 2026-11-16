import { NextResponse, type NextRequest } from "next/server";
import { buildIcs, type IcsEvent } from "@/lib/calendar";
import { getLive, upcomingLives } from "@/server/lives";

export const dynamic = "force-dynamic";

/**
 * Calendar file for the public lives.
 *   /api/calendar.ics               -> subscribe once, every planned live shows up and stays up to date
 *   /api/calendar.ics?live=<id>     -> one live (downloads)
 *   add &lang=ar for Arabic titles   (&once=1 is still accepted: a live has one date)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lang = params.get("lang") === "ar" ? "ar" : "fr";
  const only = params.get("live");

  const lives = only
    ? [await getLive(only)].filter((l): l is NonNullable<typeof l> => l !== null && l.access !== "team" && l.status !== "cancelled")
    : (await upcomingLives({ limit: 100 })).filter((l) => l.status === "scheduled" || l.status === "live");
  if (only && lives.length === 0) return new NextResponse("Not found", { status: 404 });

  // behind the host's proxy the request URL says "localhost:10000": the real address is in the forwarded headers
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  const proto = first(request.headers.get("x-forwarded-proto")) ?? request.nextUrl.protocol.replace(":", "");
  const host = first(request.headers.get("x-forwarded-host")) ?? first(request.headers.get("host")) ?? request.nextUrl.host;
  const origin = `${proto}://${host}`;
  const events: IcsEvent[] = lives.map((l) => ({
    uid: `live-${l.id}@coach-bouguerra`,
    title: `${l.title[lang]} — Coach Bouguerra`,
    description: l.description[lang],
    startsAt: l.startsAt,
    minutes: l.length,
    url: `${origin}/${lang}/lives/${l.id}`,
  }));

  const body = buildIcs(events, "Coach Bouguerra");
  const headers: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=900",
  };
  // a single live is downloaded and opened by the calendar app; the feed is read in place
  if (only) headers["Content-Disposition"] = `attachment; filename="live-${encodeURIComponent(only)}.ics"`;

  return new NextResponse(body, { headers });
}
