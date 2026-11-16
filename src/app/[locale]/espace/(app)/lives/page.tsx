import type { Metadata } from "next";
import { CalendarClock, History } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { LiveActions } from "@/components/app/LiveActions";
import type { LiveFormInitial } from "@/components/app/LiveForm";
import { LiveRow } from "@/components/app/LiveRow";
import { ScheduleLiveButton } from "@/components/app/PageButtons";
import { Notice } from "@/components/ui/form";
import type { Locale } from "@/i18n/routing";
import type { Live } from "@/lib/data";
import { defaultLiveStart, toAlgiersLocal } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { reservationCounts, reservationKey } from "@/server/engagement";
import { livekitReady } from "@/server/livekit";
import { attendanceCounts, workspaceLives } from "@/server/lives";
import { listVideos } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/lives">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.lives" });
  return { title: t("metaTitle") };
}

const toInitial = (l: Live): LiveFormInitial => ({
  id: l.id,
  ...l.typed,
  host: l.host,
  access: l.access,
  start: toAlgiersLocal(l.startsAt),
  length: l.length,
  replaySlug: l.replaySlug ?? "",
  coverVersion: l.coverVersion,
  status: l.status,
});

export default async function WorkspaceLives({ params }: PageProps<"/[locale]/espace/lives">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("lives_manage");

  const t = await getTranslations("space.lives");
  const { current, past } = await workspaceLives();
  const all = [...current, ...past];
  const [reserved, attended, videos] = await Promise.all([
    reservationCounts(all.map((l) => ({ liveId: l.id, startsAt: l.startsAt }))),
    attendanceCounts(all.map((l) => l.id)),
    listVideos(),
  ]);
  const choices = videos.map((v) => ({ slug: v.slug, title: v.title[locale] }));
  const defaultStart = defaultLiveStart();

  const row = (l: Live) => {
    const count = reserved.get(reservationKey(l.id, l.startsAt)) ?? 0;
    return (
      <li key={l.id} className="py-4 first:pt-0 last:pb-0">
        <LiveRow
          live={l}
          reserved={count}
          attended={attended.get(l.id)}
          action={
            <LiveActions live={toInitial(l)} reserved={count} videos={choices} defaultStart={defaultStart} />
          }
        />
      </li>
    );
  };

  return (
    <>
      <AppPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={<ScheduleLiveButton defaultStart={defaultStart} videos={choices} />}
      />

      {!livekitReady() && (
        <div className="mt-6">
          <Notice tone="info">{t("roomOff")}</Notice>
        </div>
      )}

      <Card className="mt-8">
        <div className="mb-5 flex items-center gap-2 text-sm font-bold text-ink-500">
          <CalendarClock className="size-4" aria-hidden /> {t("coming")}
        </div>
        {current.length > 0 ? (
          <ul className="divide-y divide-ink-100">{current.map(row)}</ul>
        ) : (
          <p className="py-6 text-center text-ink-500">{t("none")}</p>
        )}
        <p className="mt-5 text-sm leading-relaxed text-ink-500">{t("liveHelp")}</p>
      </Card>

      {past.length > 0 && (
        <Card className="mt-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-ink-500">
            <History className="size-4" aria-hidden /> {t("past")}
          </div>
          <ul className="divide-y divide-ink-100">{past.map(row)}</ul>
        </Card>
      )}
    </>
  );
}
