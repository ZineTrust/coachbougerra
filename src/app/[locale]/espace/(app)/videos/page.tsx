import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { PublishVideoButton } from "@/components/app/PageButtons";
import { VideosManager } from "@/components/app/VideosManager";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { sourceToLink } from "@/lib/video-source";
import { listVideoSources, listVideos } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/videos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.videos" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceVideos({ params }: PageProps<"/[locale]/espace/videos">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireStaff("videos_manage");

  const t = await getTranslations("space.videos");
  const common = await getTranslations("common");
  const [videos, sources] = await Promise.all([listVideos(), listVideoSources()]);
  const links = Object.fromEntries([...sources].map(([slug, source]) => [slug, sourceToLink(source)]));

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} action={<PublishVideoButton />} />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-500">{t("linkHelp")}</p>
      <div className="mt-6">
        <VideosManager videos={videos} links={links} />
      </div>
      <p className="mt-4 text-xs text-ink-400">{common("sampleNote")}</p>
    </>
  );
}
