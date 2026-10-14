/*
  Points, levels and badges. Everything here is DERIVED from what a member
  actually did (profile filled in, formations finished, scripts used, lives
  reserved), so there is nothing to keep in sync: change a number here and every
  member's score follows.
*/

export interface MemberStats {
  /** name and city filled in */
  profileComplete: boolean;
  /** formations marked as finished */
  videosDone: number;
  /** different toolbox scripts copied */
  scriptsUsed: number;
  /** lives the member reserved a place at */
  reservations: number;
}

export const POINTS = {
  profile: 20,
  video: 30,
  script: 5,
  reservation: 10,
} as const;

export function pointsOf(s: MemberStats): number {
  return (
    (s.profileComplete ? POINTS.profile : 0) +
    s.videosDone * POINTS.video +
    s.scriptsUsed * POINTS.script +
    s.reservations * POINTS.reservation
  );
}

export const LEVELS = [
  { id: "newcomer", min: 0 },
  { id: "explorer", min: 100 },
  { id: "builder", min: 250 },
  { id: "leader", min: 500 },
  { id: "mentor", min: 1000 },
] as const;
export type LevelId = (typeof LEVELS)[number]["id"];

export function levelOf(points: number) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (points >= l.min) index = i;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  return {
    index,
    id: current.id as LevelId,
    next: next ? { id: next.id as LevelId, min: next.min } : null,
    /** 0..1 progress towards the next level (1 at the top level) */
    progress: next ? (points - current.min) / (next.min - current.min) : 1,
    toNext: next ? next.min - points : 0,
  };
}

export const BADGES = [
  { id: "profile", earned: (s: MemberStats) => s.profileComplete },
  { id: "firstFormation", earned: (s: MemberStats) => s.videosDone >= 1 },
  { id: "studious", earned: (s: MemberStats) => s.videosDone >= 5 },
  { id: "toolbox", earned: (s: MemberStats) => s.scriptsUsed >= 3 },
  { id: "toolboxPro", earned: (s: MemberStats) => s.scriptsUsed >= 10 },
  { id: "liveReady", earned: (s: MemberStats) => s.reservations >= 1 },
  { id: "regular", earned: (s: MemberStats) => s.reservations >= 3 },
] as const;
export type BadgeId = (typeof BADGES)[number]["id"];

export const badgesOf = (s: MemberStats) =>
  BADGES.map((b) => ({ id: b.id as BadgeId, earned: b.earned(s) }));
