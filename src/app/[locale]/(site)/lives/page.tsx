import type { Metadata } from "next";
import { CalendarClock, CalendarDays, Clock, Link2, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Countdown } from "@/components/site/Countdown";
import { LiveCard } from "@/components/site/LiveCard";
import { PageHeader } from "@/components/site/PageHeader";
import { ReserveButton } from "@/components/site/ReserveButton";
import { CoachPhoto } from "@/components/ui/Avatar";
import { LiveAccessBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Locale } from "@/i18n/routing";
import { upcomingLives } from "@/lib/data";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";
import { reservationKey } from "@/server/engagement";
import { reserveInfos } from "@/server/reserve";

export async function generateMetadata({ params }: PageProps<"/[locale]/lives">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "livesPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function LivesPage({ params }: PageProps<"/[locale]/lives">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("livesPage");
  const common = await getTranslations("common");

  const [next, ...others] = upcomingLives();
  const infos = await reserveInfos([next, ...others]);
  const infoOf = (l: (typeof others)[number]) => infos.get(reservationKey(l.id, l.startsAt))!;
  const nextInfo = infoOf(next);

  const steps = [
    { icon: CalendarClock, title: t("step1Title"), text: t("step1Text") },
    { icon: Link2, title: t("step2Title"), text: t("step2Text") },
    { icon: Users, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        {/* next live — featured */}
        <article className="grid overflow-hidden rounded-3xl bg-ink-900 text-white shadow-lift lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-64 lg:min-h-full">
            <CoachPhoto photo="portrait" alt="Coach Bougerra" sizes="(min-width: 1024px) 40vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent lg:bg-linear-to-r lg:rtl:bg-linear-to-l" />
          </div>
          <div className="flex flex-col p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-live px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                {t("next")}
              </span>
              <LiveAccessBadge access={next.access} />
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {next.title[locale]}
            </h2>
            <p className="mt-4 leading-relaxed text-ink-200">{next.description[locale]}</p>

            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-200">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-jade-300" aria-hidden />
                <dd className="font-semibold">
                  {formatLiveDay(next.startsAt, locale)} ·{" "}
                  <bdi>{formatLiveTime(next.startsAt, locale)}</bdi>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-jade-300" aria-hidden />
                <dd>{common("min", { count: next.length })}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-jade-300" aria-hidden />
                <dd>{common("registered", { count: next.registered + nextInfo.count })}</dd>
              </div>
            </dl>

            <Countdown target={next.startsAt.toISOString()} className="mt-7" />

            <div className="mt-8">
              <ReserveButton
                liveId={next.id}
                startsAt={next.startsAt.toISOString()}
                premium={next.access === "premium"}
                signedIn={nextInfo.signedIn}
                allowed={nextInfo.allowed}
                reserved={nextInfo.reserved}
                count={nextInfo.count}
                size="lg"
                onDark
              />
            </div>
          </div>
        </article>

        {/* the rest */}
        <div className="mt-16">
          <SectionHeading eyebrow={t("othersEyebrow")} title={t("othersTitle")} />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {others.map((l) => (
              <LiveCard key={l.id} live={l} reserve={infoOf(l)} />
            ))}
          </div>
          <p className="mt-8">
            <Button href="/calendrier" variant="outline">
              <CalendarDays className="size-4" aria-hidden /> {(await getTranslations("calendar"))("metaTitle")}
            </Button>
          </p>
        </div>
      </section>

      {/* how it works */}
      <section className="bg-ivory-100">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionHeading align="center" eyebrow={t("howEyebrow")} title={t("howTitle")} />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-jade-50 text-jade-600">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span dir="ltr" className="font-display text-3xl font-semibold text-ink-200">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
