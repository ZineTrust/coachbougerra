import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { AddNoteButton, NoteCard } from "@/components/app/AssistantNotes";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/form";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/utils";
import { assistantConfigured } from "@/server/assistant/provider";
import { answersToReview, assistantStats, listNotes } from "@/server/assistant/store";
import { requireOwner } from "@/server/current";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/assistant">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.assistant" });
  return { title: t("metaTitle") };
}

/** Only Coach Bougerra opens this page: what the assistant knows, and where it fell short. */
export default async function AssistantAdminPage({ params }: PageProps<"/[locale]/espace/assistant">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireOwner();

  const t = await getTranslations("space.assistant");
  const [stats, notes, review] = await Promise.all([assistantStats(), listNotes(), answersToReview(30)]);

  const figures = [
    { key: "today", value: stats.today },
    { key: "last30", value: stats.last30 },
    { key: "members", value: stats.members },
    { key: "up", value: stats.up },
    { key: "down", value: stats.down },
    { key: "weak", value: stats.weak },
  ] as const;

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} action={<AddNoteButton />} />

      <div className="mt-6 space-y-8">
        {!assistantConfigured() && <Notice tone="error">{t("notConfigured")}</Notice>}

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {figures.map(({ key, value }) => (
            <div key={key} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-900/5">
              <dd className="font-display text-3xl font-semibold tabular-nums">{value}</dd>
              <dt className="mt-1 text-[0.8125rem] leading-snug text-ink-500">{t(`stats.${key}`)}</dt>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="text-xl font-bold">{t("notesTitle")}</h2>
          <p className="mt-1 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-600">{t("notesLead")}</p>
          {notes.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-6 py-12 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
              {t("noNotes")}
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 lg:grid-cols-2">
              {notes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={{
                    id: n.id,
                    title: n.title,
                    keywords: n.keywords,
                    body: n.body,
                    enabled: n.enabled,
                    updated: formatDateTime(n.updatedAt, locale),
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold">{t("reviewTitle")}</h2>
          <p className="mt-1 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-600">{t("reviewLead")}</p>
          {review.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-6 py-12 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
              {t("noReview")}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {review.map((r) => (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.rating === -1 && <Badge tone="alert">{t("badDown")}</Badge>}
                      {r.weak && <Badge tone="premium">{t("badWeak")}</Badge>}
                      <span className="text-xs text-ink-400">
                        {t("memberN", { code: r.memberCode })} · {formatDateTime(r.createdAt, locale)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-400">{t("question")}</p>
                    <p dir="auto" className="mt-0.5 whitespace-pre-line break-words text-[0.9375rem] font-medium">
                      {r.question}
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-400">{t("answer")}</p>
                    <p
                      dir="auto"
                      className="mt-0.5 line-clamp-6 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-ink-700"
                    >
                      {r.answer}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[0.8125rem] leading-snug text-ink-500">{t("privacy")}</p>
      </div>
    </>
  );
}
