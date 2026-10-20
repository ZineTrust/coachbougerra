"use client";

import { useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu, MEMBER_LINKS } from "./AccountMenu";
import { AppearanceMenu } from "./AppearanceMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";

const LINKS = [
  { href: "/lives", key: "lives" },
  { href: "/videos", key: "courses" },
  { href: "/histoire", key: "story" },
  { href: "/#debloquer", key: "unlock" },
] as const;

export interface NavbarProps {
  /** the signed-in member, if any */
  member: { code: number; unread: number; name: string; photoVersion: number | null; groups: number } | null;
  /** true only for a signed-in staff account (the link is never shown to others) */
  isStaff: boolean;
}

export function Navbar({ member, isStaff }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Remember which page the menu was opened on: navigating elsewhere closes it
  // without needing an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Logo tone="dark" />

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("main")}>
          {LINKS.map((l) => {
            const active =
              l.href === pathname || (!l.href.includes("#") && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-ink-300 hover:bg-white/5 hover:text-white",
                )}
              >
                {t(l.key)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <AppearanceMenu />
          <LanguageSwitcher />
          {/* only rendered for a signed-in staff account */}
          {isStaff && (
            <Button href="/espace" variant="gold" size="sm">
              <ShieldCheck className="size-[18px]" aria-hidden /> {t("staffSpace")}
            </Button>
          )}
          {member ? (
            <>
              <NotificationBell initial={member.unread} />
              <AccountMenu code={member.code} name={member.name} photoVersion={member.photoVersion} groups={member.groups} />
            </>
          ) : (
            <>
              <Button href="/connexion" variant="ghost-light" size="sm">
                {t("login")}
              </Button>
              <Button href="/connexion?mode=register" variant="primary" size="sm">
                {t("join")}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {isStaff && (
            <Link
              href="/espace"
              aria-label={t("staffSpace")}
              className="grid size-[40px] place-items-center rounded-full bg-gold-400 text-ink-950 shadow-[0_6px_16px_-6px_rgb(224_180_85/0.8)]"
            >
              <ShieldCheck className="size-5" aria-hidden />
            </Link>
          )}
          {member && <NotificationBell initial={member.unread} />}
          <button
            type="button"
            onClick={() => setOpenOn(open ? null : pathname)}
            className="grid size-[44px] place-items-center rounded-full text-white hover:bg-white/10"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-ink-950 px-5 pb-6 pt-3 lg:hidden">
          <nav className="flex flex-col" aria-label={t("mobile")}>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-3.5 text-lg font-semibold text-white hover:bg-white/5"
              >
                {t(l.key)}
              </Link>
            ))}
            {member && (
              <div className="mt-2 border-t border-white/10 pt-2">
                {MEMBER_LINKS.map(({ href, key, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-lg font-semibold text-jade-300 hover:bg-white/5"
                  >
                    <Icon className="size-5" aria-hidden />
                    {t(key)}
                    {key === "groups" && member.groups > 0 && (
                      <span className="ms-auto rounded-full bg-live px-2 py-0.5 text-xs tabular-nums text-white">
                        {member.groups > 99 ? "99+" : member.groups}
                      </span>
                    )}
                    {key === "myAccount" && (
                      <span dir="ltr" className="ms-auto rounded-full bg-jade-600 px-2 py-0.5 text-xs tabular-nums text-white">
                        #{member.code}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </nav>
          {isStaff && (
            <Button href="/espace" variant="gold" size="md" className="mt-3 w-full">
              <ShieldCheck className="size-[18px]" aria-hidden /> {t("staffSpace")}
            </Button>
          )}
          {!member && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button href="/connexion" variant="ghost-light" size="md">
                {t("login")}
              </Button>
              <Button href="/connexion?mode=register" variant="primary" size="md">
                {t("join")}
              </Button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            <AppearanceMenu up />
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
