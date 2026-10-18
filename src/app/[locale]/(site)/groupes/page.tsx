import type { Metadata } from "next";
import { Eye, Megaphone, UsersRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreateGroupForm, InvitationList } from "@/components/groups/GroupForms";
import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { emDark } from "@/components/ui/rich";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn, formatDateTime } from "@/lib/utils";
import { requireMember } from "@/server/current";
import { listInvitations, listMyGroups } from "@/server/groups";

export async function generateMetadata({ params }: PageProps<"/[locale]/groupes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "groups" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function GroupsPage({ params }: PageProps<"/[locale]/groupes">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const member = await requireMember();
  const t = await getTranslations("groups");
  const [groups, invitations] = await Promise.all([listMyGroups(member.code), listInvitations(member.code)]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:py-16">
        <div className="space-y-10">
          {invitations.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">{t("invitationsTitle")}</h2>
              <div className="mt-4">
                <InvitationList
                  invitations={invitations.map((i) => ({
                    groupId: i.groupId,
                    name: i.name,
                    description: i.description,
                    inviterCode: i.inviterCode,
                    inviterName: i.inviterName,
                  }))}
                />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold">{t("myGroups")}</h2>
            {groups.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white px-6 py-14 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
                {t("none")}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {groups.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/groupes/${g.id}`}
                      className={cn(
                        "flex items-start gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-900/5 transition-colors hover:bg-ivory-50 sm:p-5",
                        g.unread > 0 && "ring-jade-400",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-xl",
                          g.kind === "official" ? "bg-gold-100 text-gold-700" : "bg-jade-50 text-jade-600",
                        )}
                      >
                        {g.kind === "official" ? (
                          <Megaphone className="size-6" aria-hidden />
                        ) : (
                          <UsersRound className="size-6" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span dir="auto" className="font-bold leading-snug">
                            {g.name}
                          </span>
                          {g.kind === "official" && <Badge tone="premium">{t("officialBadge")}</Badge>}
                          <span className="text-xs text-ink-400">{t("membersCount", { count: g.memberCount })}</span>
                        </span>
                        <span dir="auto" className="mt-1 line-clamp-1 block text-sm text-ink-500">
                          {g.last
                            ? `${g.last.author.fromStaff ? t("team") : (g.last.author.name ?? t("memberN", { code: g.last.author.code ?? 0 }))} : ${g.last.body}`
                            : t("noMessages")}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        {g.last && (
                          <span className="text-xs text-ink-400">{formatDateTime(g.last.createdAt, locale)}</span>
                        )}
                        {g.unread > 0 && (
                          <span className="grid min-w-[22px] place-items-center rounded-full bg-live px-1.5 text-[11px] font-bold leading-[22px] text-white">
                            {g.unread > 99 ? "99+" : g.unread}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
            <h2 className="text-lg font-bold">{t("createTitle")}</h2>
            <div className="mt-4">
              <CreateGroupForm />
            </div>
          </div>
          <p className="flex items-start gap-2.5 rounded-2xl bg-ivory-100 p-4 text-[13px] leading-relaxed text-ink-600">
            <Eye className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
            {t("teamCanRead")}
          </p>
        </aside>
      </section>
    </>
  );
}
