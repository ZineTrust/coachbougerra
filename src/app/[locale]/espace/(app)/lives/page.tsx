import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { LiveOnAirButton } from "@/components/app/LiveOnAirButton";
import { LiveRow } from "@/components/app/LiveRow";
import { ScheduleLiveButton, StartLiveButton } from "@/components/app/PageButtons";
import type { Locale } from "@/i18n/routing";
import { upcomingLives } from "@/lib/data";
import { requireStaff } from "@/server/current";
import { getLiveNow } from "@/server/engagement";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/lives">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.lives" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceLives({ params }: PageProps<"/[locale]/espace/lives">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireStaff("lives_manage");

  const t = await getTranslations("space.lives");
  const common = await getTranslations("common");
  const lives = upcomingLives(new Date(), { includeTeam: true });
  const onAir = await getLiveNow();

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} action={<ScheduleLiveButton />} />

      <Card className="mt-8">
        <div className="mb-5 flex items-center gap-2 text-sm font-bold text-ink-500">
          <CalendarClock className="size-4" aria-hidden /> {t("thisWeek")}
        </div>
        <ul className="divide-y divide-ink-100">
          {lives.map((l) => (
            <li key={l.id} className="py-4 first:pt-0 last:pb-0">
              <LiveRow
                live={l}
                action={
                  l.access === "team" ? (
                    <StartLiveButton />
                  ) : (
                    <LiveOnAirButton liveId={l.id} onAir={onAir?.liveId === l.id} />
                  )
                }
              />
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-ink-500">{t("liveHelp")}</p>
        <p className="mt-5 text-xs text-ink-400">{common("sampleNote")}</p>
      </Card>
    </>
  );
}
