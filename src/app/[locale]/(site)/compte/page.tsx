import type { Metadata } from "next";
import {
  BellRing,
  CheckCheck,
  KeyRound,
  LockOpen,
  LogOut,
  Mail,
  PartyPopper,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { changeMemberPasswordAction, logoutMemberAction } from "@/actions/auth";
import { markAllReadAction } from "@/actions/notifications";
import { CopyCode } from "@/components/account/CopyCode";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PwaCard } from "@/components/account/PwaCard";
import { MemberAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PasswordChangeForm } from "@/components/ui/PasswordChangeForm";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { VIDEOS } from "@/lib/data";
import { POINTS } from "@/lib/gamification";
import { GRANT_ALL_LIVES, GRANT_ALL_VIDEOS } from "@/lib/permissions";
import { lastDayOfMonth } from "@/lib/unlock";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requireMember } from "@/server/current";
import { avatarVersion } from "@/server/engagement";
import { getGrants, isProfileComplete } from "@/server/members";
import { notificationsForMember } from "@/server/notifications";
import { requestsThisMonth } from "@/server/unlocks";

export async function generateMetadata({ params }: PageProps<"/[locale]/compte">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "account" });
  return { title: t("metaTitle"), robots: { index: false } };
}

function Card({
  icon: Icon,
  title,
  action,
  children,
  id,
}: {
  icon: typeof UserRound;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-jade-50 text-jade-600">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/compte">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const member = await requireMember();
  const { bienvenue } = await searchParams;
  const [t, tt, tp, tn, tu, grants, notifications, photoVersion, unlockRequests] = await Promise.all([
    getTranslations("account"),
    getTranslations("titles"),
    getTranslations("profile"),
    getTranslations("nav"),
    getTranslations("unlock"),
    getGrants(member.code),
    notificationsForMember(member.code),
    avatarVersion(member.code),
    requestsThisMonth(member.code),
  ]);
  const unread = notifications.filter((n) => !n.read).length;
  const firstName = member.fullName?.trim().split(/\s+/)[0] ?? null;

  const accessLines: string[] = [];
  if (grants.includes(GRANT_ALL_VIDEOS)) accessLines.push(t("accessAllVideos"));
  if (grants.includes(GRANT_ALL_LIVES)) accessLines.push(t("accessAllLives"));
  if (!grants.includes(GRANT_ALL_VIDEOS)) {
    for (const g of grants.filter((k) => k.startsWith("video:"))) {
      const video = VIDEOS.find((v) => `video:${v.slug}` === g);
      if (video) accessLines.push(t("accessVideo", { title: video.title[locale] }));
    }
  }

  const profile: [string, string, boolean?][] = [
    [t("email"), member.email, true],
    [t("phone"), member.phone, true],
    [t("ultimateCode"), member.ultimateCode, true],
    [t("rank"), tt(member.title), true],
  ];

  return (
    <>
      {/* code banner */}
      <section className="stage relative overflow-hidden">
        <div className="dots absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
          {bienvenue !== undefined && (
            <div className="mb-8 flex items-start gap-3 rounded-2xl bg-jade-500/15 p-4 ring-1 ring-jade-400/30 sm:p-5">
              <PartyPopper className="mt-0.5 size-6 shrink-0 text-jade-300" aria-hidden />
              <div>
                <p className="font-bold text-white">{t("welcomeTitle")}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-200">{t("welcomeText")}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <MemberAvatar
              code={member.code}
              name={member.fullName ?? String(member.code)}
              photoVersion={photoVersion}
              className="size-16 text-xl ring-2 ring-white/20"
            />
            {firstName && (
              <p dir="auto" className="font-display text-2xl font-semibold text-white sm:text-3xl">
                {tp("hello", { name: firstName })}
              </p>
            )}
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
            {t("codeLabel")}
          </p>
          <div className="mt-3">
            <CopyCode code={member.code} />
          </div>
          <p className="mt-4 text-sm text-ink-300">
            {t("since", { date: formatDate(member.createdAt, locale) })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/mon-parcours" variant="gold" size="sm">
              {tn("myPath")}
            </Button>
            <Button href="/boite-a-outils" variant="ghost-light" size="sm">
              {tn("toolbox")}
            </Button>
            <Button href="/calendrier" variant="ghost-light" size="sm">
              {tn("calendar")}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:py-14">
        <div className="space-y-6">
          <Card id="profil" icon={UserRound} title={tp("title")}>
            {!isProfileComplete(member) && (
              <p className="mb-5 rounded-xl bg-gold-100 px-4 py-3 text-sm font-semibold text-ink-800">
                {tp("completeHint", { points: POINTS.profile })}
              </p>
            )}
            <ProfileForm
              code={member.code}
              fullName={member.fullName ?? ""}
              city={member.city ?? ""}
              showInRanking={member.showInRanking}
              photoVersion={photoVersion}
            />
          </Card>

          <Card
            id="deblocages"
            icon={LockOpen}
            title={tu("accountTitle")}
            action={
              <Button href="/videos" variant="soft" size="sm">
                {tu("seeCourses")}
              </Button>
            }
          >
            {unlockRequests.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-ink-600">{tu("accountEmpty")}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {unlockRequests.map((r) => {
                  const video = VIDEOS.find((v) => v.slug === r.videoSlug);
                  return (
                    <li key={r.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          href={`/videos/${r.videoSlug}`}
                          dir="auto"
                          className="min-w-0 flex-1 font-semibold text-ink-900 hover:text-jade-700"
                        >
                          {video?.title[locale] ?? r.videoSlug}
                        </Link>
                        <Badge
                          tone={
                            r.status === "approved" ? "free" : r.status === "pending" ? "premium" : "alert"
                          }
                        >
                          {tu(`status.${r.status}`)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-500">
                        {r.status === "approved"
                          ? tu("validUntil", { date: formatDate(lastDayOfMonth(r.month), locale) })
                          : tu("claimedPv", { pv: r.pvClaimed })}
                        {r.status === "rejected" && r.decisionNote && (
                          <span dir="auto"> · {r.decisionNote}</span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-[13px] leading-snug text-ink-500">{tu("resetNote")}</p>
          </Card>

          <Card
            id="notifications"
            icon={BellRing}
            title={t("notifications")}
            action={
              unread > 0 && (
                <form action={markAllReadAction}>
                  <Button type="submit" variant="soft" size="sm">
                    <CheckCheck className="size-4" aria-hidden /> {t("markAll")}
                  </Button>
                </form>
              )
            }
          >
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-ink-500">{t("noNotifications")}</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {notifications.map((n) => (
                  <li key={n.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p dir="auto" className="font-bold text-ink-900">{n.title}</p>
                      {!n.read && <Badge tone="live">{t("newBadge")}</Badge>}
                    </div>
                    <p dir="auto" className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">
                      {n.body}
                    </p>
                    <p className="mt-2 text-xs text-ink-400">{formatDateTime(n.createdAt, locale)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card icon={Smartphone} title={(await getTranslations("pwa"))("title")}>
            <PwaCard vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
          </Card>

          <Card icon={KeyRound} title={t("password.title")}>
            <PasswordChangeForm
              action={changeMemberPasswordAction}
              labels={{
                current: t("password.current"),
                next: t("password.next"),
                submit: t("password.submit"),
                done: t("password.done"),
              }}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card icon={Mail} title={t("profile")}>
            <dl className="space-y-4">
              {profile.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-ink-500">{label}</dt>
                  <dd dir="auto" className="mt-0.5 break-all font-semibold text-ink-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card icon={ShieldCheck} title={t("access")}>
            {accessLines.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-ink-600">{t("accessDefault")}</p>
            ) : (
              <ul className="space-y-2.5">
                {accessLines.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[15px] font-semibold text-ink-800">
                    <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-jade-600" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <form action={logoutMemberAction}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="size-4" aria-hidden /> {(await getTranslations("common"))("logout")}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
