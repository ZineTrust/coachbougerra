import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn, formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { listConversations } from "@/server/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/messages">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.messages" });
  return { title: t("metaTitle") };
}

export default async function MessagesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/espace/messages">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("messages_manage");

  const { filter } = await searchParams;
  const unreadOnly = filter === "unread";

  const t = await getTranslations("space.messages");
  const tt = await getTranslations("titles");
  const conversations = await listConversations({ unreadOnly });

  const tabs = [
    { href: "/espace/messages", label: t("filterAll"), active: !unreadOnly },
    { href: "/espace/messages?filter=unread", label: t("filterUnread"), active: unreadOnly },
  ];

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mt-8 inline-flex rounded-full bg-white p-1 ring-1 ring-ink-200" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={tab.active}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              tab.active ? "bg-jade-600 text-white" : "text-ink-600 hover:text-ink-900",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
        {conversations.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <MessageSquare className="size-10 text-ink-300" aria-hidden />
            <p className="mt-4 text-ink-500">{unreadOnly ? t("emptyUnread") : t("empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {conversations.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/espace/messages/${c.code}`}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 transition-colors hover:bg-ivory-50 sm:px-5",
                    c.unread > 0 && "bg-jade-50/50",
                  )}
                >
                  <Avatar name={c.email} hue={(c.code * 47) % 360} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span dir="ltr" className="rounded-full bg-jade-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-jade-700">
                        #{c.code}
                      </span>
                      <span dir="ltr" className="truncate text-sm font-bold">
                        {c.email}
                      </span>
                      <span dir="ltr" className="text-xs text-ink-400">
                        {tt(c.title)}
                      </span>
                    </div>
                    <p
                      dir="auto"
                      className={cn(
                        "mt-1 truncate text-sm",
                        c.unread > 0 ? "font-semibold text-ink-900" : "text-ink-500",
                      )}
                    >
                      {c.lastFromStaff && <span className="text-ink-400">{t("you")} : </span>}
                      {c.lastBody}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-xs text-ink-400">{formatDateTime(c.lastAt, locale)}</span>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-live px-2.5 py-0.5 text-[0.6875rem] font-bold text-white">
                        {t("unread", { count: c.unread })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
