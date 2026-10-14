import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { RequestsInbox, type RequestItem } from "@/components/app/RequestsInbox";
import type { Locale } from "@/i18n/routing";
import { VIDEOS } from "@/lib/data";
import { monthKey } from "@/lib/unlock";
import { requireStaff } from "@/server/current";
import { listDecided, listPending, type RequestWithMember } from "@/server/unlocks";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/demandes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.requests" });
  return { title: t("metaTitle") };
}

export default async function RequestsPage({ params }: PageProps<"/[locale]/espace/demandes">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // answering a request gives access, so it needs the "manage members" permission
  await requireStaff("members_manage");

  const t = await getTranslations("space.requests");
  const [pending, decided] = await Promise.all([listPending(), listDecided(60)]);
  const current = monthKey();

  const toItem = (r: RequestWithMember): RequestItem => ({
    id: r.id,
    memberCode: r.memberCode,
    name: r.member.fullName,
    city: r.member.city,
    title: r.member.title,
    ultimateCode: r.member.ultimateCode,
    videoTitle: VIDEOS.find((v) => v.slug === r.videoSlug)?.title[locale] ?? r.videoSlug,
    pvRequired: r.pvRequired,
    pvClaimed: r.pvClaimed,
    verifiedPv: r.verifiedPv,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    decidedBy: r.decidedBy,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    decisionNote: r.decisionNote,
    canRevoke: r.status === "approved" && r.month === current,
  });

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-500">{t("howTo")}</p>
      <div className="mt-6">
        <RequestsInbox pending={pending.map(toItem)} decided={decided.map(toItem)} />
      </div>
    </>
  );
}
