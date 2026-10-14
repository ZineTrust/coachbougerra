import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { AddStaffButton, StaffCard } from "@/components/app/StaffManager";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/utils";
import { requireOwner } from "@/server/current";
import { listStaff } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/equipe">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.team" });
  return { title: t("metaTitle") };
}

/** Only Coach Bougerra opens this page: it creates staff logins and sets their permissions. */
export default async function TeamPage({ params }: PageProps<"/[locale]/espace/equipe">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireOwner();

  const t = await getTranslations("space.team");
  const staff = await listStaff();

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} action={<AddStaffButton />} />

      <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => (
          <StaffCard
            key={s.id}
            staff={{
              id: s.id,
              name: s.name,
              email: s.email,
              isOwner: s.isOwner,
              permissions: s.permissions,
              active: s.active,
              lastLogin: s.lastLoginAt ? formatDateTime(s.lastLoginAt, locale) : null,
            }}
          />
        ))}
      </ul>
    </>
  );
}
