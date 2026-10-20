import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  Info,
  Target,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccessBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MarkDoneButton } from "@/components/video/MarkDoneButton";
import { Player } from "@/components/video/Player";
import { RequestUnlockForm } from "@/components/video/RequestUnlockForm";
import { VideoRow } from "@/components/video/VideoRow";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { lastDayOfMonth } from "@/lib/unlock";
import { formatDate, formatDaysAgo } from "@/lib/utils";
import { currentMember } from "@/server/current";
import { doneKeys } from "@/server/engagement";
import { requestsThisMonth, videoAccessFor } from "@/server/unlocks";
import { getPublicVideoWithPv, getVideoSource, listPublicVideos, recordView } from "@/server/videos";

type Props = PageProps<"/[locale]/videos/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const video = await getPublicVideoWithPv(slug);
  if (!video) return {};
  return { title: video.title[locale as Locale], description: video.description[locale as Locale] };
}

export default async function VideoPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const [video, allVideos] = await Promise.all([getPublicVideoWithPv(slug), listPublicVideos()]);
  if (!video) notFound();

  const t = await getTranslations();
  const member = await currentMember();
  const [canWatch, requests, finishedKeys] = member
    ? await Promise.all([
        videoAccessFor(member.code),
        requestsThisMonth(member.code),
        doneKeys(member.code),
      ])
    : [null, [], new Set<string>()];
  const finished = finishedKeys.has(`video:${video.slug}`);

  const needsPv = video.pv > 0;
  const open = !needsPv || Boolean(canWatch?.(video.slug));
  const locked = !open;
  // the video's address is only handed to someone who may watch it
  const source = open ? await getVideoSource(video.slug) : null;
  // counted once per member who opens a formation they may watch
  if (member && open) await recordView(video.slug, member.code);

  // this month's latest request for this formation (newest first)
  const mine = requests.find((r) => r.videoSlug === video.slug);
  const approved = requests.find((r) => r.videoSlug === video.slug && r.status === "approved");
  const unlockedUntil = approved ? formatDate(lastDayOfMonth(approved.month), locale) : null;
  const wasRefused = mine?.status === "rejected";

  const related = [
    ...allVideos.filter((v) => v.slug !== video.slug && v.category === video.category),
    ...allVideos.filter((v) => v.slug !== video.slug && v.category !== video.category),
  ].slice(0, 5);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("video.back")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <Player
            video={video}
            locked={locked}
            source={source}
            protect={needsPv}
            viewer={member ? { code: member.code, name: member.fullName ?? "" } : null}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <AccessBadge pv={video.pv} unlocked={open} />
            <span className="text-xs font-bold uppercase tracking-wider text-jade-600">
              {t(`categories.${video.category}`)}
            </span>
            {needsPv && open && member && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-jade-700">
                <CheckCircle2 className="size-4" aria-hidden />
                {unlockedUntil ? t("unlock.validUntil", { date: unlockedUntil }) : t("video.unlocked")}
              </span>
            )}
          </div>
          <h1 dir="auto" className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {video.title[locale]}
          </h1>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
            {video.duration > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                <dt className="sr-only">{t("video.duration")}</dt>
                <dd>{t("common.min", { count: Math.round(video.duration / 60) })}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden />
              <dt className="sr-only">{t("video.viewsLabel")}</dt>
              <dd>{t("common.views", { count: video.views })}</dd>
            </div>
            <div>{t("video.ago", { when: formatDaysAgo(video.daysAgo, locale) })}</div>
          </dl>

          <p dir="auto" className="mt-6 max-w-3xl whitespace-pre-line text-[1.0625rem] leading-relaxed text-ink-600">
            {video.description[locale]}
          </p>

          {member && !locked && <MarkDoneButton slug={video.slug} done={finished} />}

          {locked && (
            <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              {/* what it takes */}
              <div className="flex flex-col rounded-2xl bg-ink-900 p-6 text-white shadow-card">
                <span className="grid size-11 place-items-center rounded-xl bg-gold-400/20 text-gold-300">
                  <Target className="size-5" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-gold-400">
                  {t("unlock.requiredLabel")}
                </p>
                <p dir="ltr" className="mt-1 text-start font-display text-5xl font-semibold tracking-tight">
                  {video.pv} <span className="text-2xl text-ink-300">PV</span>
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-200">{t("unlock.requiredText")}</p>
                <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-snug text-ink-300">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-jade-300" aria-hidden />
                  {t("unlock.resetNote")}
                </p>
              </div>

              {/* asking for it */}
              <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gold-400/50">
                {!member ? (
                  <>
                    <h2 className="text-lg font-bold">{t("unlock.visitorTitle")}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t("unlock.visitorText")}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button href="/connexion?mode=register" variant="primary" size="lg">
                        {t("nav.join")}
                      </Button>
                      <Button href="/connexion" variant="outline" size="lg">
                        {t("nav.login")}
                      </Button>
                    </div>
                  </>
                ) : mine?.status === "pending" ? (
                  <>
                    <span className="grid size-11 place-items-center rounded-xl bg-gold-100 text-gold-600">
                      <Hourglass className="size-5" aria-hidden />
                    </span>
                    <h2 className="mt-4 text-lg font-bold">{t("unlock.pendingTitle")}</h2>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
                      {t("unlock.pendingText", { pv: mine.pvClaimed })}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold">{t("unlock.askTitle")}</h2>
                    {wasRefused && (
                      <p className="mt-3 flex items-start gap-3 rounded-xl bg-live/10 px-4 py-3 text-sm leading-relaxed text-live">
                        <Info className="mt-0.5 size-[18px] shrink-0" aria-hidden />
                        <span>
                          <b>{t("unlock.refusedTitle")}</b>{" "}
                          {mine?.decisionNote ? (
                            <span dir="auto">{mine.decisionNote}</span>
                          ) : (
                            t("unlock.refusedDefault")
                          )}
                        </span>
                      </p>
                    )}
                    <p className="mb-5 mt-1.5 text-sm leading-relaxed text-ink-500">{t("unlock.askText")}</p>
                    <RequestUnlockForm slug={video.slug} required={video.pv} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <aside aria-label={t("video.nextUp")}>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-ink-500">
            {t("video.nextUp")}
          </h2>
          <div className="mt-3 flex flex-col gap-1">
            {related.map((v) => (
              <VideoRow key={v.slug} video={v} unlocked={v.pv > 0 && Boolean(canWatch?.(v.slug))} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
