import { NextResponse } from "next/server";
import { currentStaff } from "@/server/current";
import { getLiveCover } from "@/server/lives";

export const dynamic = "force-dynamic";

/**
 * The picture of a live. It is only a poster, so anybody sees it, except for a live reserved to the team
 * (its picture is for the team too).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cover = await getLiveCover(id);
  if (!cover) return new NextResponse(null, { status: 404 });
  const forTeam = cover.access === "team";
  if (forTeam && !(await currentStaff())) return new NextResponse(null, { status: 404 });

  const etag = `"${cover.updatedAt.getTime()}"`;
  const cache = forTeam ? "private, no-store" : "public, max-age=300, must-revalidate";
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": cache } });
  }
  return new NextResponse(Buffer.from(cover.base64, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": cache, ETag: etag },
  });
}
