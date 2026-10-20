import type { Metadata } from "next";
import { ArrowRight, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/site/PageHeader";
import { CoachPhoto, type PhotoKey } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/histoire">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "story" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function StoryPage({ params }: PageProps<"/[locale]/histoire">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("story");

  const gallery: { photo: PhotoKey; caption: string; alt: string; className: string }[] = [
    {
      photo: "celebration",
      caption: t("photoCelebration"),
      alt: t("altCelebration"),
      className: "aspect-[16/10] md:aspect-auto md:min-h-[26rem]",
    },
    {
      photo: "portrait",
      caption: t("photoPortrait"),
      alt: t("altPortrait"),
      className: "aspect-square md:aspect-auto md:min-h-[26rem]",
    },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 py-1.5 ps-2.5 pe-4 text-[0.8125rem] font-semibold text-gold-300">
          <Star className="size-4 fill-gold-400 text-gold-400" aria-hidden />
          {t("role")}
        </p>
      </PageHeader>

      {/* the story */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lift ring-1 ring-ink-900/5">
              <CoachPhoto photo="office" alt={t("altOffice")} sizes="(min-width: 1024px) 40vw, 90vw" />
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-ink-950/70 to-transparent" />
              <p className="absolute bottom-4 start-5 text-sm font-semibold text-white">
                {t("photoOffice")}
              </p>
            </div>
          </div>

          <div className="max-w-2xl space-y-6 text-[1.125rem] leading-[1.85] text-ink-700">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>

            <blockquote className="border-s-4 border-jade-500 bg-jade-50/60 py-5 pe-6 ps-6 font-display text-2xl font-semibold leading-snug text-ink-900">
              {t("pullQuote")}
            </blockquote>

            <p>{t("p4")}</p>

            <div className="pt-4">
              <p className="font-display text-3xl font-semibold text-ink-900">{t("signature")}</p>
              <p className="mt-1 text-sm font-semibold text-jade-700">{t("role")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* achievements */}
      <section className="bg-ivory-100">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <SectionHeading
            eyebrow={t("galleryEyebrow")}
            title={t("galleryTitle")}
            lead={t("galleryLead")}
          />
          <div className="mt-10 grid gap-5 md:grid-cols-[2fr_1fr]">
            {gallery.map((g) => (
              <figure
                key={g.photo}
                className={`relative overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-900/5 ${g.className}`}
              >
                <CoachPhoto photo={g.photo} alt={g.alt} sizes="(min-width: 768px) 60vw, 100vw" />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/75 to-transparent" />
                <figcaption className="absolute bottom-4 start-5 end-5 text-sm font-semibold text-white">
                  {g.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* call to action */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="stage relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="dots absolute inset-0 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              {t.rich("ctaTitle", emDark)}
            </h2>
            <p className="mt-5 text-lg text-ink-200">{t("ctaLead")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/videos" size="lg" variant="primary">
                {t("ctaPrimary")} <ArrowRight className="flip-rtl size-5" aria-hidden />
              </Button>
              <Button href="/connexion?mode=register" size="lg" variant="ghost-light">
                {t("ctaSecondary")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
