import { NextResponse } from "next/server";
import { currentMember } from "@/server/current";
import { notificationsForMember, unreadCount } from "@/server/notifications";

export const dynamic = "force-dynamic";

/** The latest notifications for the bell's drop-down panel. */
export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [items, count] = await Promise.all([
    notificationsForMember(member.code, 8),
    unreadCount(member.code), // total, not just among the latest eight
  ]);
  return NextResponse.json(
    {
      count,
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
