"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, LogOut, Route, UserPlus, UserRound, UsersRound, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { logoutMemberAction } from "@/actions/auth";
import { MemberAvatar } from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Member links shared by the drop-down and the mobile menu. */
export const MEMBER_LINKS = [
  { href: "/mon-parcours", key: "myPath", icon: Route },
  { href: "/groupes", key: "groups", icon: UsersRound },
  { href: "/invitation", key: "invite", icon: UserPlus },
  { href: "/boite-a-outils", key: "toolbox", icon: Wrench },
  { href: "/calendrier", key: "calendar", icon: CalendarDays },
  { href: "/compte", key: "myAccount", icon: UserRound },
] as const;

/** The signed-in member's chip in the header, opening a small menu of their spaces. */
export function AccountMenu({
  code,
  name,
  photoVersion,
  groups,
}: {
  code: number;
  name: string;
  photoVersion: number | null;
  /** invitations waiting + unread group messages */
  groups: number;
}) {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("accountMenu")}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 ps-1.5 pe-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
      >
        <MemberAvatar code={code} name={name} photoVersion={photoVersion} className="size-7 text-[0.625rem]" />
        <span className="hidden xl:inline">{t("myAccount")}</span>
        {groups > 0 && <span className="size-2 rounded-full bg-live" aria-hidden />}
        <span dir="ltr" className="rounded-full bg-jade-600 px-2 py-0.5 text-xs tabular-nums">
          #{code}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-12 z-50 w-60 overflow-hidden rounded-2xl bg-white p-1.5 text-ink-900 shadow-stage ring-1 ring-ink-900/10"
        >
          {MEMBER_LINKS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-ivory-100"
            >
              <Icon className="size-[18px] text-jade-600" aria-hidden /> {t(key)}
              {key === "groups" && groups > 0 && (
                <span className="ms-auto grid min-w-[20px] place-items-center rounded-full bg-live px-1.5 text-[0.6875rem] font-bold leading-5 text-white">
                  {groups > 99 ? "99+" : groups}
                </span>
              )}
            </Link>
          ))}
          <form action={logoutMemberAction} className="mt-1 border-t border-ink-100 pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ivory-100"
            >
              <LogOut className="flip-rtl size-[18px]" aria-hidden /> {c("logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
