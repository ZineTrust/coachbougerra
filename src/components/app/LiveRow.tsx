import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, LiveAccessBadge, LiveDot } from "@/components/ui/Badge";
import type { Locale } from "@/i18n/routing";
import type { UpcomingLive } from "@/lib/data";
import { dateTileParts, formatLiveTime } from "@/lib/utils";

export function LiveRow({
  live,
  action,
  compact = false,
  reserved,
  attended,
}: {
  live: UpcomingLive;
  action?: ReactNode;
  compact?: boolean;
  /** how many members reserved a place */
  reserved?: number;
  /** how many members came into the room */
  attended?: number;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const s = useTranslations("space.lives");
  const { weekday, day, month } = dateTileParts(live.startsAt, locale);

  return (
    <div className="flex items-center gap-4">
      {!compact && live.coverVersion !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/live-cover/${live.id}?v=${live.coverVersion}`}
          alt=""
          loading="lazy"
          className="hidden aspect-video w-20 shrink-0 rounded-lg object-cover ring-1 ring-ink-900/5 sm:block"
        />
      )}
      <div className="w-14 shrink-0 rounded-xl bg-ink-900 py-2 text-center text-white">
        <p className="truncate px-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-gold-400">
          {weekday}
        </p>
        <p className="font-display text-xl font-semibold leading-none">{day}</p>
        <p className="mt-0.5 truncate px-0.5 text-[0.5625rem] font-semibold uppercase text-ink-300">
          {month}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-bold text-ink-900">{live.title[locale]}</p>
        <p className="mt-0.5 text-sm text-ink-500">
          <bdi>{formatLiveTime(live.startsAt, locale)}</bdi> · {t("min", { count: live.length })}
          {!compact && reserved !== undefined && ` · ${t("registered", { count: reserved })}`}
          {!compact && attended ? ` · ${s("attended", { count: attended })}` : ""}
        </p>
      </div>
      {live.status === "live" && <LiveDot label={s("onAir")} />}
      {live.status === "ended" && <Badge tone="neutral">{s("ended")}</Badge>}
      {live.status === "cancelled" && <Badge tone="alert">{s("cancelled")}</Badge>}
      {!compact && <LiveAccessBadge access={live.access} />}
      {action}
    </div>
  );
}
