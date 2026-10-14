import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LiveAccessBadge } from "@/components/ui/Badge";
import type { Locale } from "@/i18n/routing";
import type { UpcomingLive } from "@/lib/data";
import { dateTileParts, formatLiveTime } from "@/lib/utils";

export function LiveRow({
  live,
  action,
  compact = false,
}: {
  live: UpcomingLive;
  action?: ReactNode;
  compact?: boolean;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const { weekday, day, month } = dateTileParts(live.startsAt, locale);

  return (
    <div className="flex items-center gap-4">
      <div className="w-14 shrink-0 rounded-xl bg-ink-900 py-2 text-center text-white">
        <p className="truncate px-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-400">
          {weekday}
        </p>
        <p className="font-display text-xl font-semibold leading-none">{day}</p>
        <p className="mt-0.5 truncate px-0.5 text-[9px] font-semibold uppercase text-ink-300">
          {month}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-ink-900">{live.title[locale]}</p>
        <p className="mt-0.5 text-sm text-ink-500">
          <bdi>{formatLiveTime(live.startsAt, locale)}</bdi> · {t("min", { count: live.length })}
          {!compact && ` · ${t("registered", { count: live.registered })}`}
        </p>
      </div>
      {!compact && <LiveAccessBadge access={live.access} />}
      {action}
    </div>
  );
}
