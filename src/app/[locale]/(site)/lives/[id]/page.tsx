import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarPlus, Clock, Lock, PlayCircle, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LiveRoom } from "@/components/live/LiveRoom";
import { LiveStatusWatcher } from "@/components/live/LiveStatusWatcher";
import { Countdown } from "@/components/site/Countdown";
import { PageHeader } from "@/components/site/PageHeader";
import { ReserveButton } from "@/components/site/ReserveButton";
import { LiveAccessBadge, LiveDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatLiveDay, formatLiveTime } from "@/lib/utils";
import { currentStaff } from "@/server/current";
import { reservationKey } from "@/server/engagement";
import { roomAccess } from "@/server/live-access";
import { livekitReady } from "@/server/livekit";
import { getLive } from "@/server/lives";
import { reserveInfos } from "@/server/reserve";
import { can } from "@/server/staff";

type Props = PageProps<"/[locale]/lives/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const live = await getLive(id);
  if (!live || live.access === "team") return {};
  return { title: live.title[locale as Locale], description: live.description[locale as Locale] };
}

export default async function LivePage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const live = await getLive(id);
  if (!live) notFound();
  const staff = await currentStaff();
  const host = Boolean(staff && can(staff, "lives_manage"));
  // a live for the team only does not exist for anybody else
  if (live.access === "team" && !host) notFound();

  const t = await getTranslations("liveRoom");
  const common = await getTranslations("common");
  const title = live.title[locale];

  const onAir = live.status === "live";
  const access = onAir ? await roomAccess(live, "viewer") : null;
  const info =
    live.status === "scheduled" ? (await reserveInfos([live])).get(reservationKey(live.id, live.startsAt)) : undefined;

  const hostLink = host && (
    <Button href={`/espace/lives/${live.id}`} variant={onAir ? "danger" : "gold"} size="lg">
      {onAir ? t("openAsHost") : t("prepareAsHost")}
    </Button>
  );

  return (
    <>
      <PageHeader eyebrow={onAir ? t("live") : t("eyebrow")} title={title} lead={live.description[locale] || undefined}>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-ink-200">
          {onAir && <LiveDot label={t("live")} />}
          <LiveAccessBadge access={live.access} />
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="size-4 text-jade-300" aria-hidden />
            {formatLiveDay(live.startsAt, locale)} · <bdi className="font-semibold">{formatLiveTime(live.startsAt, locale)}</bdi>
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-jade-300" aria-hidden /> {common("min", { count: live.length })}
          </span>
          <span className="inline-flex items-center gap-2">
            <UserRound className="size-4 text-jade-300" aria-hidden />
            <span dir="ltr">{live.host}</span>
          </span>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <Link href="/lives" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-jade-700 hover:text-jade-600">
          <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("allLives")}
        </Link>

        {/* the picture the team chose for this live (the room itself takes its place once on air) */}
        {live.coverVersion !== null && !onAir && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/live-cover/${live.id}?v=${live.coverVersion}`}
            alt=""
            className="mx-auto mb-8 aspect-video w-full max-w-2xl rounded-3xl object-cover shadow-card ring-1 ring-ink-900/5"
          />
        )}

        {/* on air */}
        {onAir &&
          (!livekitReady() ? (
            <Notice tone="info">{t("roomOffPublic")}</Notice>
          ) : access?.ok ? (
            <LiveRoom
              liveId={live.id}
              title={title}
              role="viewer"
              status="live"
              access={live.access}
              reserved={0}
              endHref="/lives"
            />
          ) : access?.reason === "signed_out" ? (
            <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
              <h2 className="font-display text-2xl font-semibold">{t("signInTitle")}</h2>
              <p className="mt-2 leading-relaxed text-ink-500">{t("signInText")}</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href="/connexion" size="lg" variant="danger">
                  {t("signIn")}
                </Button>
                {hostLink}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold-100 text-gold-600">
                <Lock className="size-7" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold">{t("reservedTitle")}</h2>
              <p className="mt-2 leading-relaxed text-ink-500">{t("reservedText")}</p>
              {hostLink && <div className="mt-6 flex justify-center">{hostLink}</div>}
            </div>
          ))}

        {/* planned */}
        {live.status === "scheduled" && (
          <div className="mx-auto max-w-2xl rounded-3xl bg-ink-900 p-8 text-white shadow-lift sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{t("notStarted")}</p>
            <Countdown target={live.startsAt.toISOString()} className="mt-5" />
            <p className="mt-6 leading-relaxed text-ink-200">{t("opensAuto")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4">
              {info && (
                <ReserveButton
                  liveId={live.id}
                  startsAt={live.startsAt.toISOString()}
                  premium={live.access === "premium"}
                  signedIn={info.signedIn}
                  allowed={info.allowed}
                  reserved={info.reserved}
                  count={info.count}
                  size="lg"
                  onDark
                />
              )}
              {hostLink}
            </div>
            {live.access !== "team" && (
              <a
                href={`/api/calendar.ics?live=${encodeURIComponent(live.id)}&lang=${locale}`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-jade-300 underline-offset-4 hover:underline"
              >
                <CalendarPlus className="size-4" aria-hidden /> {t("addToCalendar")}
              </a>
            )}
          </div>
        )}

        {/* over */}
        {live.status === "ended" && (
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
            <h2 className="font-display text-2xl font-semibold">{t("isOver")}</h2>
            <p className="mt-2 leading-relaxed text-ink-500">{live.replaySlug ? t("replayReady") : t("replayLater")}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {live.replaySlug && (
                <Button href={`/videos/${live.replaySlug}`} size="lg">
                  <PlayCircle className="size-5" aria-hidden /> {t("watchReplay")}
                </Button>
              )}
              <Button href="/lives" variant="outline" size="lg">
                {t("allLives")}
              </Button>
            </div>
          </div>
        )}

        {live.status === "cancelled" && (
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
            <h2 className="font-display text-2xl font-semibold">{t("cancelledTitle")}</h2>
            <p className="mt-2 leading-relaxed text-ink-500">{t("cancelledText")}</p>
            <Button href="/lives" className="mt-6">
              {t("allLives")}
            </Button>
          </div>
        )}
      </section>

      {(live.status === "scheduled" || live.status === "live") && (
        <LiveStatusWatcher liveId={live.id} status={live.status} startsAt={live.startsAt.toISOString()} />
      )}
    </>
  );
}
