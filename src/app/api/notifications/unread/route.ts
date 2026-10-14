import { NextResponse } from "next/server";
import { currentMember } from "@/server/current";
import { unreadCount } from "@/server/notifications";

export const dynamic = "force-dynamic";

/** Polled by the bell icon so the badge updates without a page reload. */
export async function GET() {
  const member = await currentMember();
  const count = member ? await unreadCount(member.code) : 0;
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
