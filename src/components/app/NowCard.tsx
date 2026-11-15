"use client";

import { useLocale, useTranslations } from "next-intl";
import { Countdown } from "@/components/site/Countdown";
import { LiveDot } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { useNow } from "@/lib/useNow";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";

/** Big clock + the next live, like the right-hand panel of Zoom's home. */
export function NowCard({
  next,
  canHost,
}: {
  next: { id: string; title: string; at: string; onAir: boolean } | null;
  /** the viewer may open the room (a link to the host page) */
  canHost: boolean;
}) {
  const t = useTranslations("space.dashboard");
  const c = useTranslations("countdown");
  const b = useTranslations("banner");
  const locale = useLocale() as Locale;
  const now = useNow(15_000);
  const date = now === null ? null : new Date(now);

  return (
    <section className="stage relative overflow-hidden rounded-2xl p-6 text-white shadow-lift sm:p-7">
      <div className="dots absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <p dir="ltr" className="text-start font-display text-6xl font-semibold tabular-nums tracking-tight">
          {date ? formatLiveTime(date, locale).replace("h", ":") : "--:--"}
        </p>
        <p className="mt-1 text-sm font-medium text-ink-300">
          {date ? formatLiveDay(date, locale) : " "}
        </p>

        <div className="mt-6 rounded-xl bg-white/8 p-4 ring-1 ring-white/10">
          {next ? (
            <>
              {next.onAir ? (
                <LiveDot label={b("live")} />
              ) : (
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-gold-400">{t("nowNext")}</p>
              )}
              <p className="mt-1.5 font-semibold leading-snug">{next.title}</p>
              {next.onAir ? (
                canHost && (
                  <Link
                    href={`/espace/lives/${next.id}`}
                    className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-bold text-live hover:bg-white/90"
                  >
                    {t("openRoom")}
                  </Link>
                )
              ) : (
                <p className="mt-2 text-sm text-ink-300">
                  {c("in")} <Countdown target={next.at} compact className="font-bold text-white" />
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-gold-400">{t("nowNext")}</p>
              <p className="mt-1.5 text-sm leading-snug text-ink-300">{t("noLive")}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
