import "server-only";
import { DEFAULT_DAILY_LIMIT } from "@/lib/assistant";

/** Questions one member may ask per day: ASSISTANT_DAILY_LIMIT, or a small default that fits the free AI plan. */
export function dailyLimit(): number {
  const set = Number(process.env.ASSISTANT_DAILY_LIMIT);
  return Number.isInteger(set) && set > 0 ? set : DEFAULT_DAILY_LIMIT;
}
