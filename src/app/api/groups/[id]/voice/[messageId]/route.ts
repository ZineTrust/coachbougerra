import { NextResponse, type NextRequest } from "next/server";
import { currentMember, currentStaff } from "@/server/current";
import { groupFor, voiceKeyFor } from "@/server/groups";
import { can } from "@/server/staff";
import { signWatch, storageConfigured } from "@/server/storage";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

/**
 * Plays a voice note: checks the person is in the group (or is the team, with ?as=team) and sends
 * them on to a short-lived signed address of the file. The audio element follows the redirect, so the
 * page never has to carry (or refresh) addresses. A group a member is not in answers 404.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  const groupId = Number(id);
  const message = Number(messageId);
  if (!Number.isInteger(groupId) || !Number.isInteger(message) || !storageConfigured()) return fail("not_found", 404);

  const team = request.nextUrl.searchParams.get("as") === "team";
  if (team) {
    const staff = await currentStaff();
    if (!staff || !can(staff, "groups_manage")) return fail("unauthorized", 401);
  } else {
    const member = await currentMember();
    if (!member) return fail("unauthorized", 401);
    if (!(await groupFor(groupId, member.code))) return fail("not_found", 404);
  }

  const key = await voiceKeyFor(groupId, message, team);
  if (!key) return fail("not_found", 404);
  try {
    return NextResponse.redirect(await signWatch(key), { status: 302, headers: NO_STORE });
  } catch (error) {
    console.error("[voice] could not sign a voice note address:", error);
    return fail("unavailable", 503);
  }
}
