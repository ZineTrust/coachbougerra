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

/** "2026-11-20T21:00" as typed in a date field (Algiers wall time) -> the real instant, or null. */
export function parseAlgiersLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const back = new Date(wall);
  // reject 31 February and the like
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return new Date(wall - ALGIERS_OFFSET_MIN * 60_000);
}

/** A real instant -> "2026-11-20T21:00" in Algiers wall time (the value of a date field). */
export function toAlgiersLocal(d: Date): string {
  return new Date(d.getTime() + ALGIERS_OFFSET_MIN * 60_000).toISOString().slice(0, 16);
}

/** A sensible start for a new live: the next 20:30 in Algiers (tonight, or tomorrow once it is late). */
export function defaultLiveStart(now = new Date()): string {
  const wall = new Date(now.getTime() + ALGIERS_OFFSET_MIN * 60_000);
  const day = wall.toISOString().slice(0, 10);
  const tonight = `${day}T20:30`;
  if (toAlgiersLocal(now) < `${day}T20:00`) return tonight;
  const tomorrow = new Date(wall.getTime() + 86_400_000).toISOString().slice(0, 10);
  return `${tomorrow}T20:30`;
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
