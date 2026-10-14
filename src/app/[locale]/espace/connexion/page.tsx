import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaffLoginForm } from "@/components/app/StaffLoginForm";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentStaff } from "@/server/current";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/connexion">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.login" });
  return { title: t("metaTitle") };
}

export default async function StaffLoginPage({ params }: PageProps<"/[locale]/espace/connexion">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  if (await currentStaff()) redirect({ href: "/espace", locale });
  const t = await getTranslations("space.login");

  return (
    <div className="stage relative flex min-h-dvh flex-col items-center px-5 py-8">
      <div className="dots absolute inset-0 opacity-50" aria-hidden />
      <div className="relative flex w-full max-w-md items-center justify-between">
        <Logo tone="dark" />
        <LanguageSwitcher />
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-stage sm:p-9">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold-100 text-gold-600">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-ink-500">{t("subtitle")}</p>
          <div className="mt-7">
            <StaffLoginForm />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/connexion" className="font-semibold text-jade-700 hover:text-jade-600">
              {t("member")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
