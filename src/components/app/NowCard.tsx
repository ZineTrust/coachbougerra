"use client";

import { useLocale, useTranslations } from "next-intl";
import { Countdown } from "@/components/site/Countdown";
import type { Locale } from "@/i18n/routing";
import { useNow } from "@/lib/useNow";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";

/** Big clock + the next live, like the right-hand panel of Zoom's home. */
export function NowCard({ nextTitle, nextAt }: { nextTitle: string; nextAt: string }) {
  const t = useTranslations("space.dashboard");
  const c = useTranslations("countdown");
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
          {date ? formatLiveDay(date, locale) : " "}
        </p>

        <div className="mt-6 rounded-xl bg-white/8 p-4 ring-1 ring-white/10">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-gold-400">
            {t("nowNext")}
          </p>
          <p className="mt-1.5 font-semibold leading-snug">{nextTitle}</p>
          <p className="mt-2 text-sm text-ink-300">
            {c("in")} <Countdown target={nextAt} compact className="font-bold text-white" />
          </p>
        </div>
      </div>
    </section>
  );
}
