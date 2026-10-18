import type { Metadata } from "next";
import { Megaphone, UsersRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { OfficialGroupForm } from "@/components/groups/GroupForms";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { listAllGroups } from "@/server/groups";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/groupes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.groups" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceGroups({ params }: PageProps<"/[locale]/espace/groupes">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("groups_manage");

  const t = await getTranslations("space.groups");
  const tt = await getTranslations("titles");
  const groups = await listAllGroups();

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} />
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">{t("privacyNote")}</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title={t("allGroups")}>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-ink-500">{t("none")}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/espace/groupes/${g.id}`}
                    className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <span
                      className={
                        g.kind === "official"
                          ? "grid size-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700"
                          : "grid size-11 shrink-0 place-items-center rounded-xl bg-jade-50 text-jade-600"
                      }
                    >
                      {g.kind === "official" ? (
                        <Megaphone className="size-5" aria-hidden />
                      ) : (
                        <UsersRound className="size-5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span dir="auto" className="font-bold leading-snug">
                          {g.name}
                        </span>
                        <Badge tone={g.kind === "official" ? "premium" : "neutral"}>
                          {g.kind === "official" ? t("kindOfficial") : t("kindFriends")}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-sm text-ink-500">
                        {t("membersCount", { count: g.memberCount })} · {t("messagesCount", { count: g.messageCount })}
                        {g.kind === "official" && g.titles.length > 0 && (
                          <> · {t("ranksShort", { ranks: g.titles.map((x) => tt(x)).join(", ") })}</>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-400">
                        {g.creatorStaff
                          ? t("createdByStaff", { name: g.creatorStaff })
                          : g.creatorCode !== null
                            ? t("createdByMember", { code: g.creatorCode })
                            : ""}
                        {g.lastAt ? ` · ${t("lastActivity", { date: formatDateTime(g.lastAt, locale) })}` : ` · ${t("noActivity")}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("createTitle")}>
          <p className="mb-4 text-sm leading-relaxed text-ink-500">{t("createHelp")}</p>
          <OfficialGroupForm mode="create" />
        </Card>
      </div>
    </>
  );
}
