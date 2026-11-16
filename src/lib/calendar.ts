import type { Locale } from "@/i18n/routing";
import type { Live } from "./data";

/*
  Calendar helpers. Lives are planned on real dates, shown in Algiers time, which is UTC+1
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

/** The planned lives that fall in a month (month: 0–11), placed on their Algiers day. */
export function monthOccurrences(year: number, month: number, lives: Live[]): Occurrence[] {
  const out: Occurrence[] = [];
  for (const live of lives) {
    const wall = new Date(live.startsAt.getTime() + ALGIERS_OFFSET_MS);
    if (wall.getUTCFullYear() !== year || wall.getUTCMonth() !== month) continue;
    out.push({ day: wall.getUTCDate(), live, startsAt: live.startsAt });
  }
  return out.sort((a, b) => a.day - b.day || a.startsAt.getTime() - b.startsAt.getTime());
}

/** The first and last instants of a month in Algiers time (end excluded), for database queries. */
export function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month, 1) - ALGIERS_OFFSET_MS),
    to: new Date(Date.UTC(year, month + 1, 1) - ALGIERS_OFFSET_MS),
  };
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

/** A place can be reserved at a live that is planned and not over yet. */
export function isReservableLive(live: Live, now = new Date()) {
  return live.status === "scheduled" && live.startsAt.getTime() + live.length * 60_000 > now.getTime();
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
  url: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
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
    "PRODID:-//Coach Bouguerra//Lives//FR",
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
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      `URL:${e.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
