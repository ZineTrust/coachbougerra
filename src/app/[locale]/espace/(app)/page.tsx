import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, AppPageHeader } from "@/components/app/Card";
import { DashboardActions } from "@/components/app/DashboardActions";
import { LiveRow } from "@/components/app/LiveRow";
import { NowCard } from "@/components/app/NowCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { upcomingLives } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { memberStats, recentMembers } from "@/server/members";
import { unreadConversations } from "@/server/messages";
import { notificationStats } from "@/server/notifications";
import { can, staffCount } from "@/server/staff";
import { pendingCount } from "@/server/unlocks";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space" });
  return { title: t("metaTitle") };
}

export default async function WorkspaceHome({ params }: PageProps<"/[locale]/espace">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const staff = await requireStaff();
  const t = await getTranslations("space");
  const d = await getTranslations("space.dashboard");
  const tt = await getTranslations("titles");

  const perms = {
    members: can(staff, "members_view"),
    messages: can(staff, "messages_manage"),
    notifications: can(staff, "notifications_send"),
    lives: can(staff, "lives_manage"),
    videos: can(staff, "videos_manage"),
    requests: can(staff, "members_manage"),
  };

  const [members, notifications, staffTotal, recent, unreadInbox, waiting] = await Promise.all([
    perms.members ? memberStats() : null,
    perms.notifications ? notificationStats() : null,
    staff.isOwner ? staffCount() : null,
    perms.members ? recentMembers(5) : [],
    perms.messages ? unreadConversations() : null,
    perms.requests ? pendingCount() : null,
  ]);

  const stats = [
    waiting !== null && { label: d("statRequests"), value: waiting },
    unreadInbox !== null && { label: d("statMessages"), value: unreadInbox },
    members && { label: d("statMembers"), value: members.total },
    members && { label: d("statWeek"), value: members.week },
    notifications && { label: d("statNotifications"), value: notifications.sent },
    staffTotal !== null && { label: d("statStaff"), value: staffTotal },
  ].filter((s): s is { label: string; value: number } => Boolean(s));

  const lives = upcomingLives(new Date(), { includeTeam: true });
  const showTiles = Object.values(perms).some(Boolean);

  return (
    <>
      <AppPageHeader title={d("hello", { name: staff.name })} subtitle={d("subtitle")} />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {showTiles && (
            <Card>
              <DashboardActions can={perms} />
            </Card>
          )}

          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
                  <p className="text-xs font-semibold leading-snug text-ink-500">{s.label}</p>
                  <p className="mt-2 font-display text-4xl font-semibold tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {perms.members && (
            <Card
              title={d("recent")}
              action={
                <Link href="/espace/membres" className="inline-flex items-center gap-1.5 text-sm font-bold text-jade-700 hover:text-jade-600">
                  {d("all")} <ArrowRight className="flip-rtl size-4" aria-hidden />
                </Link>
              }
            >
              {recent.length === 0 ? (
                <p className="py-4 text-center text-ink-500">{d("recentEmpty")}</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {recent.map((m) => (
                    <li key={m.code}>
                      <Link
                        href={`/espace/membres/${m.code}`}
                        className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 hover:opacity-80"
                      >
                        <Avatar name={m.email} hue={(m.code * 47) % 360} className="size-10 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p dir="ltr" className="truncate text-start text-sm font-bold">{m.email}</p>
                          <p className="text-xs text-ink-500">
                            {tt(m.title)} · {formatDate(m.createdAt, locale)}
                          </p>
                        </div>
                        <Badge tone="neutral">
                          <span dir="ltr">#{m.code}</span>
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <NowCard nextTitle={lives[0].title[locale]} nextAt={lives[0].startsAt.toISOString()} />

          <Card
            title={d("upcoming")}
            action={
              perms.lives && (
                <Link href="/espace/lives" className="text-sm font-bold text-jade-700 hover:text-jade-600">
                  {d("all")}
                </Link>
              )
            }
          >
            <div className="space-y-4">
              {lives.slice(0, 3).map((l) => (
                <LiveRow key={l.id} live={l} compact />
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-400">{t("demoLabel")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
