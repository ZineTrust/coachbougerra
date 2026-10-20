import { NextResponse } from "next/server";
import { currentMember, staffFor } from "@/server/current";
import { allow } from "@/server/rate-limit";
import { signWatch, storageConfigured } from "@/server/storage";
import { videoAccessFor } from "@/server/unlocks";
import { getWatchTarget } from "@/server/videos";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * The address to play an uploaded video from, valid for a couple of hours (the player asks again
 * when it runs out). It is only given to someone who may watch: the team, anyone for a free
 * published formation, and for a formation that needs PV the members who unlocked it. A formation
 * that is still a draft is the team's only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(`watch:${forwarded}`, 120, 10 * 60_000)) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: NO_STORE });
  }

  const target = await getWatchTarget(slug);
  if (!target || !storageConfigured()) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  if (!(await staffFor("videos_manage"))) {
    if (target.status !== "published") return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    if (target.pv > 0) {
      const member = await currentMember();
      if (!member) return NextResponse.json({ error: "login" }, { status: 401, headers: NO_STORE });
      const canWatch = await videoAccessFor(member.code);
      if (!canWatch(slug)) return NextResponse.json({ error: "locked" }, { status: 403, headers: NO_STORE });
    }
  }

  try {
    return NextResponse.json({ url: await signWatch(target.key) }, { headers: NO_STORE });
  } catch (error) {
    console.error("[watch] could not sign the address:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
