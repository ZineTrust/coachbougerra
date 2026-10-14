import type { Locale } from "@/i18n/routing";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const TAG: Record<Locale, string> = { fr: "fr-FR", ar: "ar-DZ" };
const TIME_ZONE = "Africa/Algiers";

const NBSP = String.fromCharCode(160);
const NARROW_NBSP = String.fromCharCode(8239);

/**
 * "4 210" — same grouping in both languages, with a regular no-break space
 * (the default narrow one renders almost invisibly, and Arabic's default
 * separator is a dot, which reads like a decimal point).
 */
export function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n).replaceAll(NARROW_NBSP, NBSP);
}

/** 872 -> "14:32" ; 3495 -> "58:15" */
export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Live schedule helpers                                               */
/* Algeria is UTC+1 all year (no daylight saving), so a fixed offset   */
/* is exact and keeps server and browser renders identical.            */
/* ------------------------------------------------------------------ */

const ALGIERS_OFFSET_MIN = 60;

export interface WeeklySlot {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  hour: number;
  minute: number;
}

/** Next date (as a real instant) at which a weekly Algiers-time slot starts. */
export function nextOccurrence(slot: WeeklySlot, now = new Date()) {
  const wall = new Date(now.getTime() + ALGIERS_OFFSET_MIN * 60_000);
  const target = new Date(
    Date.UTC(
      wall.getUTCFullYear(),
      wall.getUTCMonth(),
      wall.getUTCDate(),
      slot.hour,
      slot.minute,
    ),
  );
  target.setUTCDate(
    target.getUTCDate() + ((slot.weekday - wall.getUTCDay() + 7) % 7),
  );
  if (target.getTime() <= wall.getTime()) target.setUTCDate(target.getUTCDate() + 7);
  return new Date(target.getTime() - ALGIERS_OFFSET_MIN * 60_000);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(TAG[locale], { timeZone: TIME_ZONE, ...options });
    formatters.set(key, f);
  }
  return f;
}

/** The three parts shown on the little calendar tile. */
export function dateTileParts(d: Date, locale: Locale) {
  const parts = formatter(locale, { weekday: "long", day: "numeric", month: "long" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month") };
}

/** "jeudi 1 octobre" / "الخميس 1 أكتوبر" */
export function formatLiveDay(d: Date, locale: Locale) {
  const { weekday, day, month } = dateTileParts(d, locale);
  return `${weekday} ${day} ${month}`;
}

/** "21h00" in French, "21:00" in Arabic. */
export function formatLiveTime(d: Date, locale: Locale) {
  const time = formatter(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return locale === "fr" ? time.replace(":", "h") : time;
}

export function formatDate(d: Date, locale: Locale) {
  return formatter(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(d: Date, locale: Locale) {
  return formatter(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/** 5 -> "il y a 5 jours" / "قبل 5 أيام"; 14 -> "il y a 2 semaines". */
export function formatDaysAgo(days: number, locale: Locale) {
  const rtf = new Intl.RelativeTimeFormat(TAG[locale], { numeric: "auto" });
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.round(days / 7), "week");
  return rtf.format(-Math.round(days / 30), "month");
}
