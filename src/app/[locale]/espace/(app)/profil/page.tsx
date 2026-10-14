import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { changeStaffPasswordAction } from "@/actions/auth";
import { AppPageHeader, Card } from "@/components/app/Card";
import { Badge } from "@/components/ui/Badge";
import { PasswordChangeForm } from "@/components/ui/PasswordChangeForm";
import type { Locale } from "@/i18n/routing";
import { requireStaff } from "@/server/current";
import { effectivePermissions } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/profil">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.profile" });
  return { title: t("metaTitle") };
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/espace/profil">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const staff = await requireStaff();

  const t = await getTranslations("space.profile");
  const space = await getTranslations("space");

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <dl className="space-y-5">
            <div>
              <dt className="text-xs font-semibold text-ink-500">{t("name")}</dt>
              <dd className="mt-0.5 text-lg font-bold">{staff.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">{t("email")}</dt>
              <dd dir="ltr" className="mt-0.5 text-start font-semibold">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">{t("role")}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {staff.isOwner ? (
                  <Badge tone="premium">
                    <ShieldCheck className="size-3" aria-hidden /> {space("owner")}
                  </Badge>
                ) : (
                  effectivePermissions(staff).map((p) => (
                    <Badge key={p} tone="free">
                      {space(`permissions.${p}`)}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title={t("password.title")}>
          <PasswordChangeForm
            action={changeStaffPasswordAction}
            labels={{
              current: t("password.current"),
              next: t("password.next"),
              submit: t("password.submit"),
              done: t("password.done"),
            }}
          />
        </Card>
      </div>
    </>
  );
}
