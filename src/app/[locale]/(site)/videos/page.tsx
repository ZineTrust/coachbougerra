import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/site/PageHeader";
import { emDark } from "@/components/ui/rich";
import { VideoLibrary } from "@/components/video/VideoLibrary";
import type { Locale } from "@/i18n/routing";
import { currentMember } from "@/server/current";
import { videoAccessFor } from "@/server/unlocks";
import { listPublicVideos } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/videos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "coursesPage" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function VideosPage({ params }: PageProps<"/[locale]/videos">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("coursesPage");

  const [videos, member] = await Promise.all([listPublicVideos(), currentMember()]);
  const canWatch = member ? await videoAccessFor(member.code) : null;
  const unlockedSlugs = canWatch ? videos.filter((v) => v.pv > 0 && canWatch(v.slug)).map((v) => v.slug) : [];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <VideoLibrary videos={videos} unlockedSlugs={unlockedSlugs} />
      </section>
    </>
  );
}
