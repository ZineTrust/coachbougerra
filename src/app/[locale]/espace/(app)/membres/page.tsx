import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPageHeader } from "@/components/app/Card";
import { MembersTable, type MemberRow } from "@/components/app/MembersTable";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";
import { MEMBER_TITLES, isMemberTitle } from "@/lib/permissions";
import { requireStaff } from "@/server/current";
import { listMembers } from "@/server/members";
import { can } from "@/server/staff";
import { listPublicVideos } from "@/server/videos";

export async function generateMetadata({ params }: PageProps<"/[locale]/espace/membres">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "space.members" });
  return { title: t("metaTitle") };
}

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/espace/membres">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const staff = await requireStaff("members_view");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const titleParam = typeof sp.title === "string" ? sp.title : "";
  const title = isMemberTitle(titleParam) ? titleParam : undefined;

  const t = await getTranslations("space.members");
  const tt = await getTranslations("titles");
  const [{ members, total }, videos] = await Promise.all([listMembers({ query: q, title }), listPublicVideos()]);
  const filtering = Boolean(q || title);

  // plain, serializable rows for the interactive table
  const rows: MemberRow[] = members.map((m) => ({
    code: m.code,
    fullName: m.fullName,
    city: m.city,
    email: m.email,
    phone: m.phone,
    title: m.title,
    ultimateCode: m.ultimateCode,
    createdAt: m.createdAt.toISOString(),
    status: m.status,
    grants: m.grants,
  }));

  return (
    <>
      <AppPageHeader title={t("title")} subtitle={t("count", { count: total })} />

      <form className="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="relative block flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search")}
            className="h-12 w-full rounded-xl bg-white ps-11 pe-4 text-[15px] ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
          />
        </label>
        <select
          name="title"
          defaultValue={title ?? ""}
          aria-label={t("rank")}
          className="h-12 rounded-xl bg-white px-4 text-[15px] ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-jade-500"
        >
          <option value="">{t("allTitles")}</option>
          {MEMBER_TITLES.map((m) => (
            <option key={m} value={m}>
              {tt(m)}
            </option>
          ))}
        </select>
        <Button type="submit">{t("filter")}</Button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-ink-500">
            {filtering ? t("noResults") : t("empty")}
          </p>
        ) : (
          <MembersTable
            rows={rows}
            premiumVideos={videos.filter((v) => v.pv > 0)}
            canManage={can(staff, "members_manage")}
          />
        )}
      </div>
    </>
  );
}
