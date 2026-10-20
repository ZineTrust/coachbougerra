import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { VideoForm } from "@/components/app/VideoForm";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { MAX_VIDEO_BYTES, storageConfigured } from "@/server/storage";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/videos/nouvelle">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.videos" });
  return { title: t("formTitleCreate") };
}

export default async function NewVideoPage({ params }: PageProps<"/[locale]/espace/videos/nouvelle">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  await requireStaff("videos_manage");
  const t = await getTranslations("space.videos");

  return (
    <>
      <Link
        href="/espace/videos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>
      <div className="mt-4">
        <AppPageHeader title={t("formTitleCreate")} subtitle={t("createSubtitle")} />
      </div>
      <Card className="mt-8">
        <VideoForm initial={null} storageReady={storageConfigured()} maxBytes={MAX_VIDEO_BYTES} />
      </Card>
    </>
  );
}
