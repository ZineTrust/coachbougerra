import { NextResponse } from "next/server";
import { currentMember, currentStaff } from "@/server/current";
import { getAvatar } from "@/server/engagement";
import { getMember } from "@/server/members";

export const dynamic = "force-dynamic";

/**
 * A member's profile photo. It is shown to: the member themself, any staff
 * account, and everyone else only if the member chose to appear in the ranking.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const code = Number((await params).code);
  if (!Number.isInteger(code)) return new NextResponse(null, { status: 404 });

  const [viewer, staff, member] = await Promise.all([
    currentMember(),
    currentStaff(),
    getMember(code),
  ]);
  if (!member) return new NextResponse(null, { status: 404 });

  const allowed = staff || viewer?.code === code || member.showInRanking;
  if (!allowed) return new NextResponse(null, { status: 404 });

  const avatar = await getAvatar(code);
  if (!avatar) return new NextResponse(null, { status: 404 });

  const etag = `"${avatar.updatedAt.getTime()}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(Buffer.from(avatar.base64, "base64"), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300, must-revalidate",
      ETag: etag,
    },
  });
}
