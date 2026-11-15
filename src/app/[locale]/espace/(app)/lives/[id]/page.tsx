import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ExternalLink, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { LiveRoom } from "@/components/live/LiveRoom";
import { LiveStatusWatcher } from "@/components/live/LiveStatusWatcher";
import { LiveAccessBadge, LiveDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { reservationCounts, reservationKey } from "@/server/engagement";
import { livekitReady } from "@/server/livekit";
import { attendanceCounts, getLive } from "@/server/lives";
import { getVideoRecord } from "@/server/videos";

type Props = PageProps<"/[locale]/espace/lives/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const live = await getLive(id);
  return { title: live ? live.title[locale as Locale] : undefined };
}

export default async function HostLivePage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("lives_manage");

  const live = await getLive(id);
  if (!live) notFound();

  const t = await getTranslations("liveRoom");
  const common = await getTranslations("common");
  const [reserved, attended, replay] = await Promise.all([
    reservationCounts([{ liveId: live.id, startsAt: live.startsAt }]),
    attendanceCounts([live.id]),
    live.replaySlug ? getVideoRecord(live.replaySlug) : null,
  ]);
  const reservedCount = reserved.get(reservationKey(live.id, live.startsAt)) ?? 0;
  const attendedCount = attended.get(live.id) ?? 0;
  const open = live.status === "scheduled" || live.status === "live";

  return (
    <>
      <Link
        href="/espace/lives"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-jade-700 hover:text-jade-600"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("backToLives")}
      </Link>

      <AppPageHeader
        title={live.title[locale]}
        subtitle={`${formatLiveDay(live.startsAt, locale)} · ${formatLiveTime(live.startsAt, locale)} · ${common("min", { count: live.length })}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {live.status === "live" && <LiveDot label={t("live")} />}
            <LiveAccessBadge access={live.access} />
            {live.access !== "team" && live.status !== "cancelled" && (
              <Button href={`/lives/${live.id}`} variant="outline" size="sm">
                <ExternalLink className="size-4" aria-hidden /> {t("seeAsMember")}
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-8">
        {open &&
          (livekitReady() ? (
            <LiveRoom
              liveId={live.id}
              title={live.title[locale]}
              role="host"
              status={live.status === "live" ? "live" : "scheduled"}
              access={live.access}
              reserved={reservedCount}
              endHref="/espace/lives"
            />
          ) : (
            <Notice tone="info">{t("roomOffHost")}</Notice>
          ))}

        {live.status === "ended" && (
          <Card title={t("summaryTitle")}>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-ivory-50 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                  <Users className="size-4" aria-hidden /> {t("summaryAttended")}
                </dt>
                <dd className="mt-1 font-display text-3xl font-semibold">{attendedCount}</dd>
              </div>
              <div className="rounded-xl bg-ivory-50 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                  <CalendarClock className="size-4" aria-hidden /> {t("summaryReserved")}
                </dt>
                <dd className="mt-1 font-display text-3xl font-semibold">{reservedCount}</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-ink-600">
              {replay ? (
                <>
                  {t("replayAttached")}{" "}
                  <Link href={`/espace/videos/${replay.video.slug}`} className="font-semibold text-jade-700 underline-offset-4 hover:underline">
                    {replay.video.title[locale]}
                  </Link>
                </>
              ) : (
                t("replayHowTo")
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/espace/videos/nouvelle" variant="soft" size="sm">
                {t("publishRecording")}
              </Button>
              <Button href="/espace/lives" variant="outline" size="sm">
                {t("attachReplay")}
              </Button>
            </div>
          </Card>
        )}

        {live.status === "cancelled" && <Notice tone="info">{t("cancelledText")}</Notice>}
      </div>

      {open && <LiveStatusWatcher liveId={live.id} status={live.status} startsAt={live.startsAt.toISOString()} />}
    </>
  );
}
