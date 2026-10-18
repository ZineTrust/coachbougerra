import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { VideosManager } from "@/components/app/VideosManager";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { listVideos } from "@/server/videos";

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
  const videos = await listVideos();

  return (
    <>
      <AppPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button href="/espace/videos/nouvelle">
            <Plus className="size-[18px]" aria-hidden /> {t("newVideo")}
          </Button>
        }
      />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-500">{t("linkHelp")}</p>
      <div className="mt-6">
        <VideosManager videos={videos} />
      </div>
    </>
  );
}
