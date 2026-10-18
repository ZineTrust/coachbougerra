import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GroupChat } from "@/components/groups/GroupChat";
import { GroupPanel } from "@/components/groups/GroupPanel";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireMember } from "@/server/current";
import { groupFor, listGroupMembers } from "@/server/groups";

type Props = PageProps<"/[locale]/groupes/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "groups" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function GroupPage({ params }: Props) {
  const { locale: raw, id: idParam } = await params;
  setRequestLocale(raw as Locale);

  const member = await requireMember();
  const id = Number(idParam);
  const access = Number.isInteger(id) ? await groupFor(id, member.code) : null;
  if (!access) notFound();

  const t = await getTranslations("groups");
  const { group, isAdmin } = access;
  const all = await listGroupMembers(id);
  // people who have not answered an invitation are only shown to the group's admin
  const members = all.filter((m) => m.status === "member" || isAdmin);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <Link
        href="/groupes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 dir="auto" className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {group.name}
        </h1>
        {group.kind === "official" && <Badge tone="premium">{t("officialBadge")}</Badge>}
      </div>
      {group.description && (
        <p dir="auto" className="mt-2 max-w-3xl text-ink-600">
          {group.description}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-3">
          <GroupChat
            groupId={group.id}
            mode="member"
            canPostInitially={group.membersCanPost || isAdmin}
            isAdminInitially={isAdmin}
          />
        </div>
        <GroupPanel
          groupId={group.id}
          kind={group.kind}
          mode="member"
          isAdmin={isAdmin}
          selfCode={member.code}
          name={group.name}
          description={group.description}
          members={members.map((m) => ({
            code: m.code,
            name: m.fullName,
            city: m.city,
            title: m.title,
            isAdmin: m.isAdmin,
            status: m.status,
            explicit: m.explicit,
          }))}
        />
      </div>
    </section>
  );
}
