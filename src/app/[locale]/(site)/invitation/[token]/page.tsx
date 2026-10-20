import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";
import type { Locale } from "@/i18n/routing";
import { currentMember } from "@/server/current";
import { inviterByToken } from "@/server/invites";

export async function generateMetadata({ params }: PageProps<"/[locale]/invitation/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "invite" });
  // a personal link: shown nicely when shared (title and description), never indexed
  return { title: t("landingMeta"), description: t("landingMetaText"), robots: { index: false, follow: false } };
}

/** What someone sees when they open a member's invitation link (public). */
export default async function InvitationLanding({ params }: PageProps<"/[locale]/invitation/[token]">) {
  const { locale: raw, token } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const [inviter, member, t, aside] = await Promise.all([
    inviterByToken(token),
    currentMember(),
    getTranslations("invite"),
    getTranslations("auth.aside"),
  ]);
  const name = inviter ? (inviter.fullName ?? t("memberN", { code: inviter.code })) : null;
  const perks = [aside("perk1"), aside("perk2"), aside("perk3")];

  return (
    <>
      <PageHeader
        eyebrow={t("landingEyebrow")}
        title={name ? t.rich("landingTitle", { ...emDark, name }) : t.rich("landingTitleGeneric", emDark)}
        lead={name ? t("landingLead") : t("landingInvalid")}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          {member ? (
            <Button href="/compte" variant="gold" size="lg">
              {t("landingAccount")}
            </Button>
          ) : (
            <>
              <Button
                href={inviter ? `/connexion?mode=register&ref=${encodeURIComponent(token)}` : "/connexion?mode=register"}
                variant="gold"
                size="lg"
              >
                {t("landingCta")}
              </Button>
              <Button href="/connexion" variant="ghost-light" size="lg">
                {t("landingHave")}
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
        <ul className="space-y-4">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-3.5 text-lg font-semibold text-ink-800">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-jade-50 text-jade-600">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
