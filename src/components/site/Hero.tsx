import { ArrowRight, Play, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LiveDot } from "@/components/ui/Badge";
import { emDark } from "@/components/ui/rich";
import type { Locale } from "@/i18n/routing";
import type { UpcomingLive } from "@/lib/data";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";
import { Countdown } from "./Countdown";
import { LiveRoomMock } from "./LiveRoomMock";

export function Hero({ next }: { next: UpcomingLive }) {
  const t = useTranslations("home.hero");
  const locale = useLocale() as Locale;

  return (
    <section className="stage relative overflow-hidden">
      <div
        className="dots absolute inset-0 [mask-image:radial-gradient(70%_65%_at_50%_25%,black,transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-28 pt-12 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-32 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 py-1.5 ps-2.5 pe-4 text-[13px] font-semibold text-gold-300">
            <Star className="size-4 fill-gold-400 text-gold-400" aria-hidden />
            {t("badge")}
          </p>

          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.1rem]">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            {t.rich("line3", emDark)}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-200">{t("lead")}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/lives" size="lg" variant="primary">
              {t("ctaLive")} <ArrowRight className="flip-rtl size-5" aria-hidden />
            </Button>
            <Button href="/videos" size="lg" variant="ghost-light">
              <Play className="size-4 fill-current" aria-hidden /> {t("ctaCourses")}
            </Button>
          </div>

          {/* next live */}
          <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-white/6 p-4 ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <LiveDot label={t("nextLive")} />
              <p className="mt-2.5 truncate text-[15px] font-bold text-white">
                {next.title[locale]}
              </p>
              <p className="mt-0.5 text-sm text-ink-300">
                {formatLiveDay(next.startsAt, locale)} ·{" "}
                <bdi>{formatLiveTime(next.startsAt, locale)}</bdi>
              </p>
            </div>
            <Countdown target={next.startsAt.toISOString()} />
          </div>
        </div>

        <div className="px-1 pb-8 sm:px-4 lg:px-0">
          <LiveRoomMock />
        </div>
      </div>
    </section>
  );
}
