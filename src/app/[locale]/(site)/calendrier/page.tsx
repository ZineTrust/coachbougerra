import type { Metadata } from "next";
import { CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/site/PageHeader";
import { ReserveButton } from "@/components/site/ReserveButton";
import { LiveAccessBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  isReservableDate,
  monthGrid,
  monthOccurrences,
  monthParam,
  parseMonth,
  shiftMonth,
  weekStartFor,
} from "@/lib/calendar";
import { LIVES } from "@/lib/data";
import { cn, dateTileParts, formatLiveTime } from "@/lib/utils";
import { reservationKey } from "@/server/engagement";
import { reserveInfos } from "@/server/reserve";

export async function generateMetadata({ params }: PageProps<"/[locale]/calendrier">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "calendar" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const TAG: Record<Locale, string> = { fr: "fr-FR", ar: "ar-DZ" };
const ALGIERS_OFFSET_MS = 60 * 60_000;

export default async function CalendarPage({
  params,
  searchParams,
}: PageProps<"/[locale]/calendrier">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const { mois } = await searchParams;

  const t = await getTranslations("calendar");
  const common = await getTranslations("common");

  const now = new Date();
  const { year, month } = parseMonth(typeof mois === "string" ? mois : undefined, now);
  const previous = shiftMonth(year, month, -1);
  const following = shiftMonth(year, month, 1);

  // "today" as a calendar day in Algiers
  const wallNow = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  const today = {
    year: wallNow.getUTCFullYear(),
    month: wallNow.getUTCMonth(),
    day: wallNow.getUTCDate(),
  };
  const isCurrentMonth = today.year === year && today.month === month;

  const lives = LIVES.filter((l) => l.access !== "team");
  const occurrences = monthOccurrences(year, month, lives);
  const weekStart = weekStartFor(locale);
  const weeks = monthGrid(year, month, weekStart);

  const reservable = occurrences.filter((o) => isReservableDate(o.live, o.startsAt, now));
  const infos = await reserveInfos(
    reservable.map((o) => ({ id: o.live.id, access: o.live.access, startsAt: o.startsAt })),
  );

  const monthTitle = new Intl.DateTimeFormat(TAG[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(TAG[locale], { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 7 + ((weekStart + i) % 7))), // 7 Jan 2024 is a Sunday
    ),
  );

  const byDay = new Map<number, typeof occurrences>();
  for (const o of occurrences) byDay.set(o.day, [...(byDay.get(o.day) ?? []), o]);

  const navButton =
    "grid size-10 place-items-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ivory-100";

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        {/* month switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/calendrier?mois=${monthParam(previous.year, previous.month)}`}
              className={navButton}
              aria-label={t("previous")}
            >
              <ChevronLeft className="flip-rtl size-5" aria-hidden />
            </Link>
            <h2 className="min-w-40 text-center font-display text-2xl font-semibold capitalize sm:text-3xl">
              {monthTitle}
            </h2>
            <Link
              href={`/calendrier?mois=${monthParam(following.year, following.month)}`}
              className={navButton}
              aria-label={t("next")}
            >
              <ChevronRight className="flip-rtl size-5" aria-hidden />
            </Link>
          </div>
          {!isCurrentMonth && (
            <Button href="/calendrier" variant="outline" size="sm">
              {t("today")}
            </Button>
          )}
        </div>

        {/* month grid */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-ivory-50 text-center">
            {weekdays.map((d) => (
              <div key={d} className="py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-500 sm:text-xs">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-ink-100 last:border-b-0">
              {week.map((day, di) => {
                const items = day ? (byDay.get(day) ?? []) : [];
                const isToday = isCurrentMonth && day === today.day;
                return (
                  <div
                    key={di}
                    className={cn(
                      "min-h-[4.25rem] border-ink-100 p-1.5 sm:min-h-28 sm:p-2",
                      di < 6 && "border-e",
                      !day && "bg-ivory-50/60",
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
                            isToday ? "bg-ink-900 text-white" : "text-ink-700",
                          )}
                        >
                          {day}
                        </span>
                        {/* phones: one dot per live; larger screens: the time and a short title */}
                        <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                          {items.map((o) => (
                            <span
                              key={o.live.id}
                              className={cn(
                                "size-2 rounded-full",
                                o.live.access === "premium" ? "bg-gold-400" : "bg-jade-500",
                              )}
                            />
                          ))}
                        </div>
                        <div className="mt-1 hidden space-y-1 sm:block">
                          {items.map((o) => (
                            <div
                              key={o.live.id}
                              className={cn(
                                "rounded-md px-1.5 py-1 text-[11px] leading-tight",
                                o.live.access === "premium"
                                  ? "bg-gold-100 text-ink-900"
                                  : "bg-jade-50 text-jade-800",
                              )}
                            >
                              <b dir="ltr" className="block tabular-nums">
                                {formatLiveTime(o.startsAt, locale)}
                              </b>
                              <span className="line-clamp-2">{o.live.title[locale]}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* the month as a list */}
        <h3 className="mt-12 text-xl font-bold">{t("upcoming")}</h3>
        {occurrences.length === 0 ? (
          <p className="mt-4 text-ink-500">{t("none")}</p>
        ) : (
          <ul className="mt-5 grid gap-4 lg:grid-cols-2">
            {occurrences.map((o) => {
              const { weekday, day, month: monthName } = dateTileParts(o.startsAt, locale);
              const past = o.startsAt.getTime() < now.getTime();
              const info = infos.get(reservationKey(o.live.id, o.startsAt));
              return (
                <li
                  key={`${o.live.id}-${o.day}`}
                  className={cn(
                    "flex gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-900/5 sm:p-5",
                    past && "opacity-60",
                  )}
                >
                  <div className="h-fit min-w-[4.25rem] rounded-xl bg-ink-900 px-3 py-2.5 text-center text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">{weekday}</p>
                    <p className="font-display text-2xl font-semibold leading-none">{day}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-ink-300">{monthName}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <LiveAccessBadge access={o.live.access} />
                    </div>
                    <h4 className="mt-2 font-bold leading-snug">{o.live.title[locale]}</h4>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-4 text-jade-600" aria-hidden />
                        <bdi className="font-semibold">{formatLiveTime(o.startsAt, locale)}</bdi>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4 text-jade-600" aria-hidden />
                        {common("min", { count: o.live.length })}
                      </span>
                    </p>
                    {info && (
                      <ReserveButton
                        className="mt-4"
                        liveId={o.live.id}
                        startsAt={o.startsAt.toISOString()}
                        premium={o.live.access === "premium"}
                        signedIn={info.signedIn}
                        allowed={info.allowed}
                        reserved={info.reserved}
                        count={info.count}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* subscribe */}
        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-ivory-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{t("subscribe")}</p>
            <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-600">{t("subscribeHelp")}</p>
          </div>
          <a
            href={`/api/calendar.ics?lang=${locale}`}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white hover:bg-ink-700"
          >
            <CalendarPlus className="size-4" aria-hidden /> {t("subscribe")}
          </a>
        </div>
      </section>
    </>
  );
}
