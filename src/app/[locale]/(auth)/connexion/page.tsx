import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/AuthForm";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { emDark } from "@/components/ui/rich";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentMember } from "@/server/current";
import { inviterByToken } from "@/server/invites";

export async function generateMetadata({ params }: PageProps<"/[locale]/connexion">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "auth" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ConnexionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/connexion">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  if (await currentMember()) redirect({ href: "/compte", locale });

  const { mode, ref } = await searchParams;
  const t = await getTranslations("auth.aside");
  const ti = await getTranslations("invite");
  // arriving from a member's invitation link: the form carries who invited this person
  const token = typeof ref === "string" ? ref : "";
  const inviter = token ? await inviterByToken(token) : null;
  const inviterName = inviter ? (inviter.fullName ?? ti("memberN", { code: inviter.code })) : null;

  const perks = [t("perk1"), t("perk2"), t("perk3")];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="stage relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="dots absolute inset-0 opacity-60" aria-hidden />
        <div className="relative">
          <Logo tone="dark" />
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white">
            {t.rich("title", emDark)}
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-ink-100">
                <span className="grid size-6 place-items-center rounded-full bg-jade-500/20 text-jade-300">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-ink-400">{t("footer")}</p>
      </aside>

      <main className="flex flex-col items-center px-5 py-8 sm:px-8">
        <div className="flex w-full max-w-md items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Logo tone="light" />
          </div>
          <LanguageSwitcher tone="light" />
        </div>
        <div className="flex w-full flex-1 items-center justify-center py-6">
          <AuthForm
              initialMode={mode === "register" || inviter ? "register" : "login"}
              invitation={inviter ? { token, name: inviterName! } : null}
            />
        </div>
      </main>
    </div>
  );
}
