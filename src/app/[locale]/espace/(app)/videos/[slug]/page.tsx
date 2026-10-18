import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { CoverPicker } from "@/components/app/CoverPicker";
import { DeleteVideoButton } from "@/components/app/DeleteVideoButton";
import { VideoForm } from "@/components/app/VideoForm";
import { Notice } from "@/components/ui/form";
import { Player } from "@/components/video/Player";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { sourceToLink } from "@/lib/video-source";
import { requireStaff } from "@/server/current";
import { getVideoRecord } from "@/server/videos";

type Props = PageProps<"/[locale]/espace/videos/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.videos" });
  return { title: t("formTitleEdit") };
}

export default async function EditVideoPage({ params, searchParams }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("videos_manage");

  const record = await getVideoRecord(slug);
  if (!record) notFound();
  const { cree } = await searchParams;

  const t = await getTranslations("space.videos");
  const { video } = record;

  return (
    <>
      <Link
        href="/espace/videos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>
      <div className="mt-4">
        <AppPageHeader
          title={video.title[locale]}
          subtitle={t("formTitleEdit")}
          action={
            video.status === "published" ? (
              <Link
                href={`/videos/${video.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-jade-700 hover:text-jade-600"
              >
                {t("view")} <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : undefined
          }
        />
      </div>
      {cree !== undefined && (
        <div className="mt-4">
          <Notice tone="success">{t("created")}</Notice>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <VideoForm
            initial={{
              slug: video.slug,
              titleFr: record.titleFr,
              titleAr: record.titleAr,
              descriptionFr: record.descriptionFr,
              descriptionAr: record.descriptionAr,
              category: video.category,
              minutes: video.duration > 0 ? String(Math.round(video.duration / 60)) : "",
              pv: String(video.pv),
              link: record.source ? sourceToLink(record.source) : "",
              status: video.status,
            }}
          />
        </Card>

        <div className="space-y-6">
          <Card title={t("coverTitle")}>
            <CoverPicker slug={video.slug} coverVersion={video.coverVersion} />
          </Card>

          <Card title={t("previewTitle")}>
            {record.source ? (
              <Player video={video} locked={false} source={record.source} />
            ) : (
              <p className="text-sm leading-relaxed text-ink-500">{t("previewNone")}</p>
            )}
          </Card>

          <Card title={t("dangerTitle")}>
            <DeleteVideoButton slug={video.slug} />
          </Card>
        </div>
      </div>
    </>
  );
}
