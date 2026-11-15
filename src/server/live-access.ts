import "server-only";
import type { Live } from "@/lib/data";
import { GRANT_ALL_LIVES } from "@/lib/permissions";
import { currentMember, staffFor } from "./current";
import { memberIdentity, staffIdentity, type RoomRole } from "./livekit";
import { getGrants } from "./members";

/** Who is asking to enter the room of a live, and with what rights. */
export type RoomAccess =
  | { ok: true; role: RoomRole; identity: string; name: string; memberCode: number | null }
  | { ok: false; reason: "signed_out" | "live_forbidden" };

/** The name shown in the room: the profile name, or the member number when there is none. */
export const displayName = (member: { code: number; fullName: string | null }) =>
  member.fullName?.trim() || `#${member.code}`;

/**
 * - `as: "host"`: a staff account allowed to manage lives (they animate the room).
 * - otherwise: a signed-in member, for a free live, or a reserved one they were given access to.
 *   Lives meant for the team are only for staff.
 */
export async function roomAccess(live: Live, as: "host" | "viewer"): Promise<RoomAccess> {
  if (as === "host") {
    const staff = await staffFor("lives_manage");
    if (!staff) return { ok: false, reason: "live_forbidden" };
    return { ok: true, role: "host", identity: staffIdentity(staff.id), name: staff.name, memberCode: null };
  }

  const member = await currentMember();
  if (!member) return { ok: false, reason: "signed_out" };
  if (live.access === "team") return { ok: false, reason: "live_forbidden" };
  if (live.access === "premium") {
    const grants = await getGrants(member.code);
    if (!grants.includes(GRANT_ALL_LIVES) && !grants.includes(`live:${live.id}`)) {
      return { ok: false, reason: "live_forbidden" };
    }
  }
  return {
    ok: true,
    role: "audience",
    identity: memberIdentity(member.code),
    name: displayName(member),
    memberCode: member.code,
  };
}
