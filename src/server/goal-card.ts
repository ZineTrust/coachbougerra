import "server-only";
import type { GoalCardProps } from "@/components/account/GoalCard";
import type { Locale } from "@/i18n/routing";
import { daysLeftInMonth } from "@/lib/goal";
import { monthKey } from "@/lib/unlock";
import { getGoal, getPreviousGoal } from "./goals";
import { videoAccessFor } from "./unlocks";
import { listPublicVideos } from "./videos";

const TAG: Record<Locale, string> = { fr: "fr-FR", ar: "ar-DZ-u-nu-latn" };

/** "octobre 2026" for a "2026-10" key. */
function monthName(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(TAG[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${key}-15T12:00:00Z`),
  );
}

/** Everything the "monthly goal" card shows, for a member (used on the account and journey pages). */
export async function goalCardProps(code: number, locale: Locale): Promise<GoalCardProps> {
  const month = monthKey();
  const [goal, previous, videos, canWatch] = await Promise.all([
    getGoal(code, month),
    getPreviousGoal(code, month),
    listPublicVideos(),
    videoAccessFor(code),
  ]);

  // the cheapest formation still locked for this member that more PV would get them close to
  const made = goal?.currentPv ?? 0;
  const closest = videos
    .filter((v) => v.pv > made && !canWatch(v.slug))
    .sort((a, b) => a.pv - b.pv)[0];

  return {
    monthLabel: monthName(month, locale),
    goal: goal ? { targetPv: goal.targetPv, currentPv: goal.currentPv } : null,
    previous: previous
      ? { targetPv: previous.targetPv, currentPv: previous.currentPv, monthLabel: monthName(previous.month, locale) }
      : null,
    daysLeft: daysLeftInMonth(),
    nextUnlock: closest ? { title: closest.title[locale], pv: closest.pv, missing: closest.pv - made } : null,
  };
}
