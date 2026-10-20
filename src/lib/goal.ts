/* Small helpers for the monthly PV goal (no server code: also used by the browser). */

const ALGIERS_OFFSET_MS = 60 * 60_000;

/** Days left in the month, today included, in Algiers time. */
export function daysLeftInMonth(date = new Date()): number {
  const wall = new Date(date.getTime() + ALGIERS_OFFSET_MS);
  const last = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + 1, 0)).getUTCDate();
  return last - wall.getUTCDate() + 1;
}

/** The share of the goal reached, 0 to 100 (it stops at 100 even if the member went beyond). */
export function goalPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.floor((current / target) * 100));
}

/** A few round numbers offered when no goal is set yet. */
export const GOAL_SUGGESTIONS = [500, 1000, 2000, 5000] as const;
