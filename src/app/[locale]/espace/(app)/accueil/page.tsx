import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { HomeVideosManager } from "@/components/app/HomeVideosManager";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { HOME_VIDEO_MAX_BYTES, HOME_VIDEOS_MAX, listHomeVideos } from "@/server/home-videos";
import { signPublic, storageConfigured } from "@/server/storage";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/accueil">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.homeVideos" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceHome({ params }: PageProps<"/[locale]/espace/accueil">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireStaff("videos_manage");

  const t = await getTranslations("space.homeVideos");
  const ready = storageConfigured();
  const videos = await listHomeVideos();
  const managed = await Promise.all(
    videos.map(async (v) => {
      let previewSrc: string | null = null;
      if (v.provider === "file" && ready) {
        try {
          previewSrc = await signPublic(v.ref);
        } catch {
          previewSrc = null;
        }
      }
      return { id: v.id, provider: v.provider, ref: v.provider === "file" ? "" : v.ref, bytes: v.bytes, active: v.active, previewSrc };
    }),
  );

  return (
    <>
      <AppPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button href="/" variant="outline">
            <ExternalLink className="size-[18px]" aria-hidden /> {t("viewSite")}
          </Button>
        }
      />
      <div className="mt-8 max-w-4xl">
        <Card>
          <HomeVideosManager
            videos={managed}
            storageReady={ready}
            maxBytes={HOME_VIDEO_MAX_BYTES}
            full={videos.length >= HOME_VIDEOS_MAX}
          />
        </Card>
      </div>
    </>
  );
}
