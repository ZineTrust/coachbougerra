import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/app/Card";
import { GroupChat } from "@/components/groups/GroupChat";
import { storageConfigured } from "@/server/storage";
import { OfficialGroupForm } from "@/components/groups/GroupForms";
import { GroupPanel } from "@/components/groups/GroupPanel";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { getGroup, listGroupMembers } from "@/server/groups";

type Props = PageProps<"/[locale]/espace/groupes/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.groups" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceGroup({ params }: Props) {
  const { locale: raw, id: idParam } = await params;
  setRequestLocale(raw as Locale);
  await requireStaff("groups_manage");

  const id = Number(idParam);
  const group = Number.isInteger(id) ? await getGroup(id) : null;
  if (!group) notFound();

  const t = await getTranslations("space.groups");
  const members = await listGroupMembers(id);

  return (
    <>
      <Link
        href="/espace/groupes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 dir="auto" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {group.name}
        </h1>
        <Badge tone={group.kind === "official" ? "premium" : "neutral"}>
          {group.kind === "official" ? t("kindOfficial") : t("kindFriends")}
        </Badge>
      </div>
      {group.description && (
        <p dir="auto" className="mt-2 max-w-3xl text-ink-600">
          {group.description}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-3">
          <GroupChat groupId={group.id} mode="team" canPostInitially isAdminInitially voiceReady={storageConfigured()} />
          <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-500">
            <Eye className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("readingAsTeam")}
          </p>
        </div>

        <div className="space-y-5">
          <GroupPanel
            groupId={group.id}
            kind={group.kind}
            mode="team"
            isAdmin
            selfCode={null}
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
          {group.kind === "official" && (
            <Card title={t("settingsTitle")}>
              <OfficialGroupForm
                mode="edit"
                groupId={group.id}
                name={group.name}
                description={group.description}
                titles={group.titles}
                membersCanPost={group.membersCanPost}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
