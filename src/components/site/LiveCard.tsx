import { CalendarClock, Clock, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { LiveAccessBadge } from "@/components/ui/Badge";
import type { Locale } from "@/i18n/routing";
import type { UpcomingLive } from "@/lib/data";
import { dateTileParts, formatLiveTime } from "@/lib/utils";
import type { ReserveInfo } from "@/server/reserve";
import { ReserveButton } from "./ReserveButton";

export function LiveCard({ live, reserve }: { live: UpcomingLive; reserve: ReserveInfo }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { weekday, day, month } = dateTileParts(live.startsAt, locale);

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-[4.5rem] rounded-xl bg-ink-900 px-3.5 py-2.5 text-center text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">{weekday}</p>
          <p className="font-display text-2xl font-semibold leading-none">{day}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase text-ink-300">{month}</p>
        </div>
        <LiveAccessBadge access={live.access} />
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug text-ink-900">{live.title[locale]}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
        {live.description[locale]}
      </p>

      <dl className="mb-5 mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-600">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-4 text-jade-600" aria-hidden />
          <dd className="font-semibold">
            <bdi>{formatLiveTime(live.startsAt, locale)}</bdi>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 text-jade-600" aria-hidden />
          <dd>{t("common.min", { count: live.length })}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-jade-600" aria-hidden />
          <dd>{t("common.registered", { count: live.registered + reserve.count })}</dd>
        </div>
      </dl>

      <div className="mt-auto border-t border-ink-100 pt-4">
        <div className="mb-3 flex min-w-0 items-center gap-2.5">
          <Avatar name={live.host} className="size-8 text-xs" />
          <span dir="ltr" className="truncate text-sm font-semibold text-ink-700">
            {live.host}
          </span>
        </div>
        <ReserveButton
          liveId={live.id}
          startsAt={live.startsAt.toISOString()}
          premium={live.access === "premium"}
          signedIn={reserve.signedIn}
          allowed={reserve.allowed}
          reserved={reserve.reserved}
        />
      </div>
    </article>
  );
}
