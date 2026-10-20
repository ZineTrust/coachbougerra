import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, ShieldCheck, UserRound, Settings2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/app/Card";
import { MemberAccessForm, MemberActions } from "@/components/app/MemberForms";
import { MemberUnlocks, type UnlockLine } from "@/components/app/MemberUnlocks";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { levelOf, pointsOf } from "@/lib/gamification";
import { isStepDone, resolvePath } from "@/lib/path";
import { lastDayOfMonth } from "@/lib/unlock";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { doneKeys, statsFor } from "@/server/engagement";
import { invitedCount, sponsorOf } from "@/server/invites";
import { getGrants, getMember, isProfileComplete } from "@/server/members";
import { can } from "@/server/staff";
import { requestsThisMonth } from "@/server/unlocks";
import { listPublicVideos, videoTitles } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/membres/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.members" });
  return { title: t("detailTitle", { code }) };
}

export default async function MemberPage({ params }: PageProps<"/[locale]/espace/membres/[code]">) {
  const { locale: raw, code: codeParam } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const staff = await requireStaff("members_view");
  const code = Number(codeParam);
  const member = Number.isInteger(code) ? await getMember(code) : null;
  if (!member) notFound();

  const t = await getTranslations("space.members");
  const tt = await getTranslations("titles");
  const tp = await getTranslations("path");
  const [grants, done, requests, publicVideos, titles, sponsor, invited] = await Promise.all([
    getGrants(member.code),
    doneKeys(member.code),
    requestsThisMonth(member.code),
    listPublicVideos(),
    videoTitles(),
    sponsorOf(member.code),
    invitedCount(member.code),
  ]);
  const unlockLines: UnlockLine[] = requests.map((r) => ({
    id: r.id,
    videoTitle: titles.get(r.videoSlug)?.[locale] ?? r.videoSlug,
    status: r.status,
    pvClaimed: r.pvClaimed,
    pvRequired: r.pvRequired,
    validUntil: r.status === "approved" ? formatDate(lastDayOfMonth(r.month), locale) : null,
    note: r.decisionNote,
  }));

  const profileComplete = isProfileComplete(member);
  const stats = await statsFor(member.code, profileComplete);
  const points = pointsOf(stats);
  const level = levelOf(points);
  const steps = resolvePath(
    member.title,
    publicVideos.map((v) => v.slug),
  );
  const stepsDone = steps.filter((s) =>
    isStepDone(s, { profileComplete, doneKeys: done, reservations: stats.reservations }),
  ).length;

  const info: [string, string][] = [
    [t("name"), member.fullName ?? t("noName")],
    ...(member.city ? ([[t("city"), member.city]] as [string, string][]) : []),
    [t("progress"), `${tp("progress", { done: stepsDone, total: steps.length })} · ${t("points", { points })} · ${tp(`levels.${level.id}`)}`],
    [t("email"), member.email],
    [t("phone"), member.phone],
    [t("rank"), tt(member.title)],
    [t("ultimateCode"), member.ultimateCode],
    [t("registered"), formatDate(member.createdAt, locale)],
    ...(sponsor
      ? ([[t("invitedBy"), `#${sponsor.code}${sponsor.fullName ? ` · ${sponsor.fullName}` : ""}`]] as [string, string][])
      : []),
    ...(invited > 0 ? ([[t("invitedCount"), String(invited)]] as [string, string][]) : []),
    [t("lastLogin"), member.lastLoginAt ? formatDateTime(member.lastLoginAt, locale) : t("never")],
  ];
  const canManage = can(staff, "members_manage");
  const canNotify = can(staff, "notifications_send");

  return (
    <>
      <Link
        href="/espace/membres"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("detailTitle", { code: member.code })}
        </h1>
        {canNotify && (
          <Button href={`/espace/notifications?to=${member.code}`} variant="soft">
            <Bell className="size-[18px]" aria-hidden /> {t("notify")}
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card title={t("info")}>
            <dl className="space-y-4">
              {info.map(([label, value]) => (
                <div key={label} className="flex items-start gap-3">
                  <UserRound className="mt-0.5 size-[18px] shrink-0 text-ink-300" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-ink-500">{label}</dt>
                    <dd dir="auto" className="mt-0.5 break-all font-semibold">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          {canManage && (
            <Card title={t("manage")}>
              <div className="mb-4 flex items-center gap-2 text-ink-400">
                <Settings2 className="size-4" aria-hidden />
              </div>
              <MemberActions code={member.code} status={member.status} />
            </Card>
          )}
        </div>

        <div className="space-y-6">
        <Card title={t("unlocksHeading")}>
          <MemberUnlocks lines={unlockLines} canManage={canManage} />
        </Card>

        <Card title={t("accessHeading")}>
          <div className="mb-4 flex items-center gap-2 text-jade-600">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <MemberAccessForm
            code={member.code}
            grants={grants}
            premiumVideos={publicVideos.filter((v) => v.pv > 0)}
            readOnly={!canManage}
          />
        </Card>
        </div>
      </div>
    </>
  );
}
