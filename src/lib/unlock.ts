/*
  Unlocking a formation with PV. A consultant's PV on Ultimate start again from
  zero every month, so an unlock only lasts for the month it was approved in and
  nothing needs to be "reset": at the start of the next month the old approvals
  simply stop counting. Months follow Algiers time (UTC+1, no daylight saving).
*/

const ALGIERS_OFFSET_MS = 60 * 60_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10": the month a date falls in, in Algiers time. */
export function monthKey(date = new Date()): string {
  const wall = new Date(date.getTime() + ALGIERS_OFFSET_MS);
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}`;
}

/** The last day of a "2026-10" month (at midday, so it formats as that day anywhere). */
export function lastDayOfMonth(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0, 12));
}

/** The most PV a request may claim: a sanity limit, not a business rule. */
export const MAX_PV = 100_000;

export type UnlockStatus = "pending" | "approved" | "rejected" | "revoked";

/** A "pending" request from an earlier month can no longer be answered. */
export type UnlockView = UnlockStatus | "expired";

export const UNLOCK_NOTE_MAX = 300;
