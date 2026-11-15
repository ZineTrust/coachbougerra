import { NextResponse } from "next/server";
import { getLive } from "@/server/lives";

export const dynamic = "force-dynamic";

/**
 * Where a live stands (planned, on air, over). The page of a live that has not begun asks this every few
 * seconds, so the room opens by itself the moment the host starts. Nothing private is in the answer.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/lives/[id]/status">) {
  const { id } = await ctx.params;
  const live = await getLive(id);
  return NextResponse.json(
    { status: live?.status ?? "missing", startsAt: live?.startsAt.toISOString() ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
