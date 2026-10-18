import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Check,
  Lock,
  Medal,
  MessagesSquare,
  Radio,
  Trophy,
  UserRound,
  Wrench,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProgressRing } from "@/components/account/ProgressRing";
import { PageHeader } from "@/components/site/PageHeader";
import { MemberAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { BADGES, POINTS, badgesOf, levelOf, pointsOf, type BadgeId } from "@/lib/gamification";
import { isStepDone, resolvePath, stepKey, type PathStep } from "@/lib/path";
import { getScript } from "@/lib/toolbox";
import { cn } from "@/lib/utils";
import { requireMember } from "@/server/current";
import { doneKeys, ranking, statsFor } from "@/server/engagement";
import { isProfileComplete } from "@/server/members";
import { videoAccessFor } from "@/server/unlocks";
import { listPublicVideos } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/mon-parcours">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "path" });
  return { title: t("metaTitle"), robots: { index: false } };
}

const BADGE_ICONS: Record<BadgeId, typeof Award> = {
  profile: UserRound,
  firstFormation: BookOpenCheck,
  studious: Medal,
  toolbox: Wrench,
  toolboxPro: MessagesSquare,
  liveReady: Radio,
  regular: Trophy,
};

const SHOWN_IN_RANKING = 10;

export default async function PathPage({ params }: PageProps<"/[locale]/mon-parcours">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const member = await requireMember();
  const [t, tt, canWatch, videos, done, entries] = await Promise.all([
    getTranslations("path"),
    getTranslations("titles"),
    videoAccessFor(member.code),
    listPublicVideos(),
    doneKeys(member.code),
    ranking(100),
  ]);

  const profileComplete = isProfileComplete(member);
  const stats = await statsFor(member.code, profileComplete);
  const points = pointsOf(stats);
  const level = levelOf(points);
  const badges = badgesOf(stats);
  const earnedCount = badges.filter((b) => b.earned).length;

  const steps = resolvePath(
    member.title,
    videos.map((v) => v.slug),
  ).map((step) => ({
    step,
    done: isStepDone(step, { profileComplete, doneKeys: done, reservations: stats.reservations }),
  }));
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? null;

  /** Where a step leads, how it reads, and whether the member can open it. */
  const describe = (step: PathStep) => {
    if (step.kind === "profile") {
      return { title: t("profileStep"), help: t("profileHelp"), href: "/compte#profil", locked: false };
    }
    if (step.kind === "live") {
      return { title: t("liveStep"), help: t("liveHelp"), href: "/calendrier", locked: false };
    }
    if (step.kind === "toolbox") {
      const script = getScript(step.ref!);
      return {
        title: t("toolboxStep", { title: script?.title[locale] ?? "" }),
        help: null,
        href: "/boite-a-outils",
        locked: false,
      };
    }
    const video = videos.find((v) => v.slug === step.ref);
    return {
      title: t("videoStep", { title: video?.title[locale] ?? "" }),
      help: null,
      href: `/videos/${step.ref}`,
      locked: Boolean(video && video.pv > 0 && !canWatch(step.ref!)),
    };
  };

  const myRank = entries.findIndex((e) => e.code === member.code) + 1; // 0 when not listed
  const firstName = member.fullName?.trim().split(/\s+/)[0] ?? null;

  const next = nextStep ? describe(nextStep.step) : null;

  const how = [
    { text: t("howProfile", { points: POINTS.profile }), icon: UserRound },
    { text: t("howVideo", { points: POINTS.video }), icon: BookOpenCheck },
    { text: t("howScript", { points: POINTS.script }), icon: Wrench },
    { text: t("howLive", { points: POINTS.reservation }), icon: Radio },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")}>
        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-6 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-7">
          <ProgressRing
            value={steps.length ? doneCount / steps.length : 0}
            label={`${doneCount}/${steps.length}`}
            sublabel={t("progress", { done: doneCount, total: steps.length })}
          />
          <div className="min-w-0 flex-1 basis-64 text-white">
            {firstName && <p dir="auto" className="text-sm text-ink-300">{firstName}</p>}
            <p className="mt-1 text-sm text-ink-300">
              {t("rank")} : <b className="text-white">{tt(member.title)}</b>
            </p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="font-display text-4xl font-semibold tabular-nums">
                {t("points", { points })}
              </span>
              <span className="rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-ink-950">
                {t("level")} {level.index + 1} · {t(`levels.${level.id}`)}
              </span>
            </p>
            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={Math.round(level.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-gold-400" style={{ width: `${level.progress * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-300">
              {level.next
                ? t("toNext", { count: level.toNext, next: t(`levels.${level.next.id}`) })
                : t("maxLevel")}
            </p>
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:py-16">
        <div className="space-y-8">
          {/* what to do next */}
          {next && nextStep ? (
            <div className="rounded-2xl bg-jade-600 p-6 text-white shadow-lift sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-jade-100">{t("next")}</p>
              <p className="mt-2 text-xl font-bold leading-snug">{next.title}</p>
              {next.help && <p className="mt-1.5 text-jade-50">{next.help}</p>}
              {next.locked ? (
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-200">
                  <Lock className="size-4" aria-hidden /> {t("locked")}
                </p>
              ) : (
                <Button href={next.href} variant="gold" className="mt-5">
                  {t("open")} <ArrowRight className="flip-rtl size-4" aria-hidden />
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-jade-50 p-6 text-center font-bold text-jade-800 ring-1 ring-jade-100">
              {t("allDone")}
            </div>
          )}

          {/* the steps */}
          <div>
            <h2 className="text-xl font-bold">{t("stepsTitle")}</h2>
            <ol className="mt-5 space-y-3">
              {steps.map(({ step, done: isDone }, i) => {
                const d = describe(step);
                return (
                  <li key={`${stepKey(step)}-${i}`}>
                    <Link
                      href={d.href}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-900/5 transition-colors hover:bg-ivory-50 sm:p-5",
                        isDone && "bg-jade-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                          isDone ? "bg-jade-600 text-white" : "bg-ivory-100 text-ink-500 ring-1 ring-ink-200",
                        )}
                      >
                        {isDone ? <Check className="size-[18px]" strokeWidth={3} aria-hidden /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block font-semibold leading-snug",
                            isDone ? "text-ink-500 line-through decoration-ink-300" : "text-ink-900",
                          )}
                        >
                          {d.title}
                        </span>
                        {d.help && !isDone && <span className="mt-0.5 block text-sm text-ink-500">{d.help}</span>}
                      </span>
                      {d.locked && !isDone && <Lock className="size-4 shrink-0 text-gold-600" aria-label={t("locked")} />}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* badges */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold">{t("badgesTitle")}</h2>
              <p className="text-sm font-semibold text-ink-500">
                {t("badgesCount", { earned: earnedCount, total: BADGES.length })}
              </p>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {badges.map(({ id, earned }) => {
                const Icon = BADGE_ICONS[id];
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl p-4 ring-1",
                      earned ? "bg-white shadow-card ring-gold-300/60" : "bg-ivory-100/60 ring-ink-900/5",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-xl",
                        earned ? "bg-gold-100 text-gold-700" : "bg-ink-100 text-ink-300",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block font-bold", !earned && "text-ink-500")}>
                        {t(`badges.${id}.name`)}
                      </span>
                      <span className="block text-sm leading-snug text-ink-500">
                        {t(`badges.${id}.description`)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="space-y-8">
          {/* leaderboard */}
          <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
            <h2 className="flex items-center gap-2.5 text-lg font-bold">
              <Trophy className="size-5 text-gold-600" aria-hidden /> {t("rankingTitle")}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t("rankingLead")}</p>

            {entries.length === 0 ? (
              <p className="mt-5 text-ink-500">{t("rankingEmpty")}</p>
            ) : (
              <ol className="mt-5 space-y-1">
                {entries.slice(0, SHOWN_IN_RANKING).map((e, i) => (
                  <li
                    key={e.code}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2 py-2",
                      e.code === member.code && "bg-jade-50",
                    )}
                  >
                    <span dir="ltr" className="w-6 text-center text-sm font-bold tabular-nums text-ink-400">
                      {i + 1}
                    </span>
                    <MemberAvatar
                      code={e.code}
                      name={e.fullName ?? String(e.code)}
                      photoVersion={e.hasAvatar ? 1 : null}
                      className="size-9 text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-sm font-semibold">
                        {e.fullName ?? t("member", { code: e.code })}
                      </span>
                      {e.city && (
                        <span dir="auto" className="block truncate text-xs text-ink-500">
                          {e.city}
                        </span>
                      )}
                    </span>
                    <span dir="ltr" className="text-sm font-bold tabular-nums text-ink-700">
                      {e.points}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {member.showInRanking ? (
              myRank > 0 && (
                <p className="mt-4 rounded-xl bg-jade-50 px-3 py-2.5 text-sm font-semibold text-jade-800">
                  {t("rankingYou", { rank: myRank })}
                </p>
              )
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-500">{t("rankingOff")}</p>
            )}
            <Button href="/compte#profil" variant="outline" size="sm" className="mt-4">
              {t("editProfile")}
            </Button>
          </div>

          {/* how points work */}
          <div className="rounded-2xl bg-ivory-100 p-6">
            <h2 className="text-lg font-bold">{t("howTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {how.map(({ text, icon: Icon }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] font-medium text-ink-700">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-jade-600">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
