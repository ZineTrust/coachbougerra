import { ArrowRight } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Features } from "@/components/site/Features";
import { Hero } from "@/components/site/Hero";
import { LiveCard } from "@/components/site/LiveCard";
import { StoryTeaser } from "@/components/site/StoryTeaser";
import { UnlockSteps } from "@/components/site/UnlockSteps";
import { emLight } from "@/components/ui/rich";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoCard } from "@/components/video/VideoCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { upcomingLives } from "@/lib/data";
import { currentMember } from "@/server/current";
import { reservationKey } from "@/server/engagement";
import { reserveInfos } from "@/server/reserve";
import { videoAccessFor } from "@/server/unlocks";
import { listPublicVideos } from "@/server/videos";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("home");

  const lives = upcomingLives();
  const [infos, videos, member] = await Promise.all([reserveInfos(lives), listPublicVideos(), currentMember()]);
  const canWatch = member ? await videoAccessFor(member.code) : null;
  // the first four, in the order the team set in the workspace
  const featured = videos.slice(0, 4);

  const seeAll = "inline-flex items-center gap-2 text-sm font-bold text-jade-700 hover:text-jade-600";

  return (
    <>
      <Hero next={lives[0]} />
      <Features />

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
        <SectionHeading
          eyebrow={t("lives.eyebrow")}
          title={t.rich("lives.title", emLight)}
          lead={t("lives.lead")}
          action={
            <Link href="/lives" className={seeAll}>
              {t("lives.all")} <ArrowRight className="flip-rtl size-4" aria-hidden />
            </Link>
          }
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {lives.slice(0, 3).map((l) => (
            <LiveCard key={l.id} live={l} reserve={infos.get(reservationKey(l.id, l.startsAt))!} />
          ))}
        </div>
      </section>

      <section className="bg-ivory-100">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <SectionHeading
            eyebrow={t("courses.eyebrow")}
            title={t.rich("courses.title", emLight)}
            lead={t("courses.lead")}
            action={
              <Link href="/videos" className={seeAll}>
                {t("courses.all")} <ArrowRight className="flip-rtl size-4" aria-hidden />
              </Link>
            }
          />
          {featured.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((v) => (
                <VideoCard key={v.slug} video={v} unlocked={Boolean(canWatch?.(v.slug))} />
              ))}
            </div>
          ) : (
            <p className="mt-10 rounded-2xl bg-white px-6 py-14 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
              {t("courses.soon")}
            </p>
          )}
        </div>
      </section>

      <StoryTeaser />
      <UnlockSteps />
      <CtaBanner />
    </>
  );
}
