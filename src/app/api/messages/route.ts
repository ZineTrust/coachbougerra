import { NextResponse } from "next/server";
import { currentMember } from "@/server/current";
import { listThread, unreadReplies } from "@/server/messages";

export const dynamic = "force-dynamic";

/** The signed-in member's own conversation with the team (used by the contact button). */
export async function GET() {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [messages, unread] = await Promise.all([listThread(member.code), unreadReplies(member.code)]);
  return NextResponse.json(
    {
      unread,
      messages: messages.map((m) => ({
        id: m.id,
        fromStaff: m.fromStaff,
        staffName: m.staffName,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
