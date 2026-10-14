import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");

  const columns = [
    {
      title: t("platform"),
      links: [
        { href: "/lives", label: t("lives") },
        { href: "/videos", label: t("courses") },
        { href: "/histoire", label: t("story") },
        { href: "/#debloquer", label: t("unlock") },
      ],
    },
    {
      title: t("account"),
      links: [
        { href: "/connexion", label: t("login") },
        { href: "/connexion?mode=register", label: t("register") },
      ],
    },
  ];

  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo tone="dark" />
            <p className="mt-5 text-sm leading-relaxed">{t("blurb")}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-ink-400 sm:flex-row sm:items-start sm:justify-between">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <p className="max-w-xl sm:text-end">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
