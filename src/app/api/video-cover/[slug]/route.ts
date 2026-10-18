import { NextResponse } from "next/server";
import { currentStaff } from "@/server/current";
import { getCover } from "@/server/videos";

export const dynamic = "force-dynamic";

/**
 * The cover image of a formation. Anyone sees the cover of a published formation (it is just the
 * poster in the lists); a draft's cover is only for the team.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cover = await getCover(slug);
  if (!cover) return new NextResponse(null, { status: 404 });
  if (!cover.published && !(await currentStaff())) return new NextResponse(null, { status: 404 });

  const etag = `"${cover.updatedAt.getTime()}"`;
  const cache = cover.published ? "public, max-age=300, must-revalidate" : "private, no-store";
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": cache } });
  }
  return new NextResponse(Buffer.from(cover.base64, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": cache, ETag: etag },
  });
}
