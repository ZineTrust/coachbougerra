import { NextResponse, type NextRequest } from "next/server";
import { currentMember, currentStaff } from "@/server/current";
import { getGroup, groupFor, listMessages, markRead } from "@/server/groups";
import { can } from "@/server/staff";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The messages of one group, for the open chat to poll.
 *   ?after=<id>   only what is newer than that message (without it: the latest 100)
 *   ?read=1       the member is looking at the chat: mark it as read
 *   ?as=team      the team's view (needs the groups permission): any group, removed texts visible
 * A group a member is not in answers 404, so its existence is not revealed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const groupId = Number((await params).id);
  if (!Number.isInteger(groupId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const query = request.nextUrl.searchParams;
  const afterRaw = query.get("after");
  const after = afterRaw !== null && /^\d{1,9}$/.test(afterRaw) ? Number(afterRaw) : undefined;
  const teamView = query.get("as") === "team";

  let memberCode: number | null = null;
  let canPost = false;
  let isAdmin = false;

  if (teamView) {
    const staff = await currentStaff();
    if (!staff || !can(staff, "groups_manage")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }
    if (!(await getGroup(groupId))) return NextResponse.json({ error: "not_found" }, { status: 404 });
    canPost = true;
    isAdmin = true;
  } else {
    const member = await currentMember();
    if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    const access = await groupFor(groupId, member.code);
    if (!access) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    memberCode = member.code;
    isAdmin = access.isAdmin;
    canPost = access.group.membersCanPost || access.isAdmin;
  }

  const messages = await listMessages(groupId, { after, showRemoved: teamView });

  if (memberCode !== null && query.get("read") === "1" && messages.length > 0) {
    await markRead(groupId, memberCode, messages[messages.length - 1].id);
  }

  return NextResponse.json(
    {
      canPost,
      isAdmin,
      messages: messages.map((m) => ({
        id: m.id,
        fromStaff: m.author.fromStaff,
        code: m.author.code,
        name: m.author.name,
        mine: memberCode !== null && m.author.code === memberCode,
        body: m.body,
        removed: m.removed,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    { headers: NO_STORE },
  );
}
