import { NextResponse } from "next/server";
import { currentMember, staffFor } from "@/server/current";
import { unreadConversations, unreadReplies } from "@/server/messages";

export const dynamic = "force-dynamic";

/**
 * Two small numbers for the badges, each only if the caller is entitled to it:
 *  - replies: the member's unread answers from the team (contact button)
 *  - inbox: conversations waiting for the team (staff sidebar)
 */
export async function GET() {
  const [member, staff] = await Promise.all([currentMember(), staffFor("messages_manage")]);
  const [replies, inbox] = await Promise.all([
    member ? unreadReplies(member.code) : 0,
    staff ? unreadConversations() : 0,
  ]);
  return NextResponse.json({ replies, inbox }, { headers: { "Cache-Control": "no-store" } });
}
