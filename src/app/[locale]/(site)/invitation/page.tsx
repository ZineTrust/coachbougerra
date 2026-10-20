import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteShare } from "@/components/account/InviteShare";
import { PageHeader } from "@/components/site/PageHeader";
import { MemberAvatar } from "@/components/ui/Avatar";
import { emDark } from "@/components/ui/rich";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";
import { requireMember } from "@/server/current";
import { inviteTokenFor, listInvited } from "@/server/invites";
import { siteOrigin } from "@/server/origin";

export async function generateMetadata({ params }: PageProps<"/[locale]/invitation">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "invite" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** "Inviter des amis": the member's personal link, QR code and the people who joined through it. */
export default async function InvitePage({ params }: PageProps<"/[locale]/invitation">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const member = await requireMember();
  const [t, tt, token, origin, invited] = await Promise.all([
    getTranslations("invite"),
    getTranslations("titles"),
    inviteTokenFor(member.code),
    siteOrigin(),
    listInvited(member.code),
  ]);

  const url = `${origin}/${locale}/invitation/${token}`;
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0d1a2d", light: "#ffffff" },
  });

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t.rich("title", emDark)} lead={t("lead")} />

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-12 sm:px-8 lg:py-16">
        <InviteShare url={url} message={t("shareText", { url })} qrSvg={qrSvg} />

        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2.5 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-jade-50 text-jade-600">
              <UsersRound className="size-[18px]" aria-hidden />
            </span>
            {t("joinedTitle")}
            <span className="ms-1 text-sm font-semibold text-ink-500">{t("joinedCount", { count: invited.length })}</span>
          </h2>

          {invited.length === 0 ? (
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-600">{t("joinedEmpty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {invited.map((m) => (
                <li key={m.code} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <MemberAvatar
                    code={m.code}
                    name={m.fullName ?? String(m.code)}
                    photoVersion={null}
                    className="size-10 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate font-semibold">
                      {m.fullName ?? t("memberN", { code: m.code })}
                    </p>
                    <p className="text-sm text-ink-500">
                      {tt(m.title)} · {t("joinedOn", { date: formatDate(m.createdAt, locale) })}
                    </p>
                  </div>
                  <span dir="ltr" className="rounded-full bg-ivory-100 px-2.5 py-1 text-xs font-bold tabular-nums text-ink-600">
                    #{m.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.8125rem] leading-snug text-ink-500">{t("privacyNote")}</p>
        </div>
      </section>
    </>
  );
}
