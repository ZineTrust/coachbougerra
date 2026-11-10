import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { PageHeader } from "@/components/site/PageHeader";
import { Notice } from "@/components/ui/form";
import { emDark } from "@/components/ui/rich";
import type { Locale } from "@/i18n/routing";
import { dailyLimit } from "@/server/assistant/limit";
import { assistantConfigured } from "@/server/assistant/provider";
import { latestChat, questionsToday } from "@/server/assistant/store";
import { requireMember } from "@/server/current";

export async function generateMetadata({ params }: PageProps<"/[locale]/assistant">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "assistant" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** The AI assistant: members ask anything, in Arabic or French, whenever they want. */
export default async function AssistantPage({ params }: PageProps<"/[locale]/assistant">) {
  const { locale: raw } = await params;
  setRequestLocale(raw as Locale);

  const member = await requireMember();
  const t = await getTranslations("assistant");
  const [chat, used] = await Promise.all([latestChat(member.code), questionsToday(member.code)]);
  const configured = assistantConfigured();

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />

      <section className="mx-auto max-w-3xl space-y-4 px-5 py-8 sm:px-8 lg:py-12">
        {configured ? (
          <AssistantChat
            initialChat={chat?.id ?? null}
            initialMessages={(chat?.messages ?? []).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              rating: m.rating,
            }))}
            remaining={Math.max(0, dailyLimit() - used)}
          />
        ) : (
          <Notice tone="info">{t("off")}</Notice>
        )}
        <p className="text-[0.8125rem] leading-snug text-ink-500">{t("disclaimer")}</p>
      </section>
    </>
  );
}
