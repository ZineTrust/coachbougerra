import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/app/Card";
import { MarkConversationRead, ReplyForm } from "@/components/app/MessagesUI";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn, formatDateTime } from "@/lib/utils";
import { requireStaff } from "@/server/current";
import { getMember } from "@/server/members";
import { listThread } from "@/server/messages";
import { can } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/messages/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.messages" });
  return { title: t("member", { code }) };
}

export default async function ConversationPage({
  params,
}: PageProps<"/[locale]/espace/messages/[code]">) {
  const { locale: raw, code: codeParam } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const staff = await requireStaff("messages_manage");
  const code = Number(codeParam);
  const member = Number.isInteger(code) ? await getMember(code) : null;
  if (!member) notFound();

  const t = await getTranslations("space.messages");
  const tt = await getTranslations("titles");
  const thread = await listThread(member.code, 300);

  // the page marks itself as read once it is open
  const hasUnread = thread.length > 0 && !thread[thread.length - 1].fromStaff;

  return (
    <>
      <MarkConversationRead code={member.code} hasUnread={hasUnread} />

      <Link
        href="/espace/messages"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="flip-rtl size-4" aria-hidden /> {t("back")}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("member", { code: member.code })}
          </h1>
          <p dir="ltr" className="mt-1.5 text-start text-ink-500">
            {member.email} · {member.phone} · {tt(member.title)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {can(staff, "members_view") && (
            <Button href={`/espace/membres/${member.code}`} variant="outline" size="sm">
              <UserRound className="size-4" aria-hidden /> {t("viewMember")}
            </Button>
          )}
          {can(staff, "notifications_send") && (
            <Button href={`/espace/notifications?to=${member.code}`} variant="soft" size="sm">
              <Bell className="size-4" aria-hidden /> {t("notify")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          {thread.length === 0 ? (
            <p className="py-10 text-center text-ink-500">{t("noMessages")}</p>
          ) : (
            <ol className="space-y-4">
              {thread.map((m) => (
                <li key={m.id} className={cn("flex", m.fromStaff ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                      m.fromStaff
                        ? "rounded-se-sm bg-jade-600 text-white"
                        : "rounded-ss-sm bg-ivory-100 text-ink-900",
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 text-[11px] font-bold",
                        m.fromStaff ? "text-jade-100" : "text-jade-700",
                      )}
                    >
                      {m.fromStaff ? (m.staffName ?? t("team")) : `#${member.code}`}
                    </p>
                    <p dir="auto" className="whitespace-pre-line break-words">{m.body}</p>
                    <p className={cn("mt-1.5 text-[11px]", m.fromStaff ? "text-white/70" : "text-ink-400")}>
                      {formatDateTime(m.createdAt, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="self-start">
          <ReplyForm code={member.code} />
        </Card>
      </div>
    </>
  );
}
