import type { Locale } from "@/i18n/routing";
import type { Live } from "./data";
import { nextOccurrence } from "./utils";

/*
  Calendar helpers. Lives happen on a weekly slot in Algiers time, which is UTC+1
  all year with no daylight saving, so a fixed offset is exact.
*/

const ALGIERS_OFFSET_MS = 60 * 60_000;

/** First day of the week: Monday for French, Saturday for Arabic (0 = Sunday). */
export const weekStartFor = (locale: Locale) => (locale === "ar" ? 6 : 1);

export interface Occurrence {
  day: number;
  live: Live;
  /** the real instant it starts */
  startsAt: Date;
}

/** Every occurrence of the given weekly lives that falls in a month (month: 0–11). */
export function monthOccurrences(year: number, month: number, lives: Live[]): Occurrence[] {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const out: Occurrence[] = [];
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
    for (const live of lives) {
      if (live.slot.weekday !== weekday) continue;
      const wall = Date.UTC(year, month, day, live.slot.hour, live.slot.minute);
      out.push({ day, live, startsAt: new Date(wall - ALGIERS_OFFSET_MS) });
    }
  }
  return out.sort((a, b) => a.day - b.day || a.startsAt.getTime() - b.startsAt.getTime());
}

/** Weeks of a month as rows of 7 cells (day number, or null for padding). */
export function monthGrid(year: number, month: number, weekStart: number): (number | null)[][] {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const lead = (firstWeekday - weekStart + 7) % 7;
  const cells: (number | null)[] = [
    ...Array<number | null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Only the next two dates of a weekly live can be reserved. */
export function isReservableDate(live: Live, startsAt: Date, now = new Date()) {
  const next = nextOccurrence(live.slot, now).getTime();
  return [0, 7].some((days) => next + days * 86_400_000 === startsAt.getTime());
}

/** "2026-10" -> { year, month }, falling back to the current month (Algiers time). */
export function parseMonth(value: string | undefined, now = new Date()) {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    return { year: Number(m[1]), month: Number(m[2]) - 1 };
  }
  const wall = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() };
}

export const monthParam = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

export function shiftMonth(year: number, month: number, by: number) {
  const d = new Date(Date.UTC(year, month + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/* ------------------------------------------------------------------ */
/* .ics files ("add to my calendar")                                    */
/* ------------------------------------------------------------------ */

export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  startsAt: Date;
  minutes: number;
  /** repeats every week on the same weekday */
  weekly: boolean;
  url: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 bytes must be folded onto the next line, starting with a space. */
function fold(line: string) {
  const encoder = new TextEncoder();
  let out = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 73) {
      out += "\r\n ";
      bytes = 1;
    }
    out += ch;
    bytes += size;
  }
  return out;
}

export function buildIcs(events: IcsEvent[], calendarName: string): string {
  const stamp = icsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coach Bougerra//Lives//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const e of events) {
    const end = new Date(e.startsAt.getTime() + e.minutes * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(e.startsAt)}`,
      `DTEND:${icsDate(end)}`,
      ...(e.weekly ? [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[e.startsAt.getUTCDay()]}`] : []),
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      `URL:${e.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
