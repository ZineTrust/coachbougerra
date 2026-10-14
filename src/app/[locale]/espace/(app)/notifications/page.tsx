import type { Metadata } from "next";
import { Megaphone, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader, Card } from "@/components/app/Card";
import { NotifyForm } from "@/components/app/NotifyForm";
import { Badge } from "@/components/ui/Badge";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { listSentNotifications } from "@/server/notifications";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/notifications">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.notifications" });
  return { title: t("metaTitle") };
}

export default async function NotificationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/espace/notifications">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireStaff("notifications_send");

  const { to } = await searchParams;
  const prefill = typeof to === "string" && /^\d{1,9}$/.test(to) ? to : undefined;

  const t = await getTranslations("space.notifications");
  const sent = await listSentNotifications();

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card title={t("compose")}>
          <NotifyForm prefillCode={prefill} />
        </Card>

        <Card title={t("history")}>
          {sent.length === 0 ? (
            <p className="py-8 text-center text-ink-500">{t("historyEmpty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {sent.map((n) => (
                <li key={n.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{n.title}</p>
                    <Badge tone={n.audience === "all" ? "free" : "premium"}>
                      {n.audience === "all" ? (
                        <Megaphone className="size-3" aria-hidden />
                      ) : (
                        <Users className="size-3" aria-hidden />
                      )}
                      {n.audience === "all" ? t("toAll") : t("toCodes", { codes: n.codes.join(", ") })}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs text-ink-400">
                    {formatDateTime(n.createdAt, locale)}
                    {n.sender && ` · ${t("by", { name: n.sender })}`} · {t("readBy", { count: n.readCount })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
