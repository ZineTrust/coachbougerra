import { NextResponse, type NextRequest } from "next/server";
import { roomAccess } from "@/server/live-access";
import { isBannedFromLive, livekitReady, roomTicket } from "@/server/livekit";
import { getLive, recordAttendance } from "@/server/lives";
import { allow } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

/**
 * A ticket to enter the video room of a live. The browser then talks to the video server directly: this
 * site only says who may come in and what they may do (the host shows video, the audience watches).
 *   body: { as?: "host" }
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/lives/[id]/token">) {
  const { id } = await ctx.params;
  if (!livekitReady()) return fail("room_off", 503);

  const body = (await request.json().catch(() => ({}))) as { as?: unknown };
  const as = body.as === "host" ? "host" : "viewer";

  const live = await getLive(id);
  if (!live) return fail("unknown_live", 404);
  // who may come in comes first, so a live meant for the team (or a reserved one) is never described to others
  const access = await roomAccess(live, as);
  if (!access.ok) {
    if (live.access === "team") return fail("unknown_live", 404);
    return fail(access.reason === "signed_out" ? "forbidden" : access.reason, access.reason === "signed_out" ? 401 : 403);
  }
  // the room only exists while the live is on air: the host opens it first
  if (live.status !== "live") return fail(live.status === "cancelled" ? "live_closed" : "not_live", 409);
  if (access.role !== "host" && isBannedFromLive(live.id, access.identity)) return fail("live_banned", 403);

  // a person asks once when they join, so a tight limit only stops loops
  if (!allow(`live-token:${access.identity}`, 20, 60_000)) return fail("too_many_attempts", 429);

  const ticket = await roomTicket({ liveId: live.id, identity: access.identity, name: access.name, role: access.role });
  if (access.memberCode !== null) await recordAttendance(live.id, access.memberCode);

  return NextResponse.json(
    { ...ticket, identity: access.identity, name: access.name, role: access.role },
    { headers: NO_STORE },
  );
}
