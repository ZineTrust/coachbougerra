import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ToolboxBrowser } from "@/components/account/ToolboxBrowser";
import { PageHeader } from "@/components/site/PageHeader";
import { emDark } from "@/components/ui/rich";
import type { Locale } from "@/i18n/routing";
import { SCRIPTS } from "@/lib/toolbox";
import { requireMember } from "@/server/current";
import { doneKeys } from "@/server/engagement";

export async function generateMetadata({ params }: PageProps<"/[locale]/boite-a-outils">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "toolbox" });
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false } };
}

/** Members only: the scripts are a benefit of having an account. */
export default async function ToolboxPage({ params }: PageProps<"/[locale]/boite-a-outils">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const member = await requireMember();
  const t = await getTranslations("toolbox");
  const done = await doneKeys(member.code);
  const usedIds = SCRIPTS.filter((s) => done.has(`toolbox:${s.id}`)).map((s) => s.id);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <ToolboxBrowser scripts={SCRIPTS} usedIds={usedIds} />
      </section>
    </>
  );
}
