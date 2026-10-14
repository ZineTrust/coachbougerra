import "server-only";
import { GRANT_ALL_LIVES } from "@/lib/permissions";
import { currentMember } from "./current";
import {
  isReserved,
  reservationCounts,
  reservationKey,
  upcomingReservations,
} from "./engagement";
import { getGrants } from "./members";

/** What a page needs to know to show the right "reserve" button for the viewer. */
export interface ReserveContext {
  signedIn: boolean;
  reserved: Set<string>;
  grants: string[];
}

export async function reserveContext(): Promise<ReserveContext> {
  const member = await currentMember();
  if (!member) return { signedIn: false, reserved: new Set(), grants: [] };
  const [reserved, grants] = await Promise.all([
    upcomingReservations(member.code),
    getGrants(member.code),
  ]);
  return { signedIn: true, reserved, grants };
}

export interface ReserveInfo {
  signedIn: boolean;
  reserved: boolean;
  allowed: boolean;
  count: number;
}

/**
 * Reserve info for a list of live occurrences, keyed by `reservationKey(id, startsAt)`.
 * One read for the viewer and one for the counts, whatever the number of lives.
 */
export async function reserveInfos(
  occurrences: { id: string; access: "free" | "premium" | "team"; startsAt: Date }[],
): Promise<Map<string, ReserveInfo>> {
  const [ctx, counts] = await Promise.all([
    reserveContext(),
    reservationCounts(occurrences.map((o) => ({ liveId: o.id, startsAt: o.startsAt }))),
  ]);
  return new Map(
    occurrences.map((o) => {
      const key = reservationKey(o.id, o.startsAt);
      return [key, { ...reserveState(ctx, o, o.startsAt), count: counts.get(key) ?? 0 }];
    }),
  );
}

/** The props ReserveButton needs for one live occurrence. */
export function reserveState(
  ctx: ReserveContext,
  live: { id: string; access: "free" | "premium" | "team" },
  startsAt: Date,
) {
  return {
    signedIn: ctx.signedIn,
    reserved: isReserved(ctx.reserved, live.id, startsAt),
    allowed:
      live.access !== "premium" ||
      ctx.grants.includes(GRANT_ALL_LIVES) ||
      ctx.grants.includes(`live:${live.id}`),
  };
}
