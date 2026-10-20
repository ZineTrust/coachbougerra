"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ExternalLink,
  Home,
  KeyRound,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  PlayCircle,
  Radio,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { logoutStaffAction } from "@/actions/auth";
import { AppearanceMenu } from "@/components/site/AppearanceMenu";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { Link, usePathname } from "@/i18n/navigation";
import type { StaffPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ToastProvider } from "./Toast";

export interface ShellStaff {
  name: string;
  isOwner: boolean;
  permissions: StaffPermission[];
}

type NavKey = "home" | "members" | "requests" | "messages" | "groups" | "notifications" | "lives" | "videos" | "team";

const NAV: {
  href: string;
  key: NavKey;
  icon: LucideIcon;
  /** who sees it: a permission, "owner", or nothing = every staff account */
  needs?: StaffPermission | "owner";
  exact?: boolean;
}[] = [
  { href: "/espace", key: "home", icon: Home, exact: true },
  { href: "/espace/membres", key: "members", icon: Users, needs: "members_view" },
  { href: "/espace/demandes", key: "requests", icon: KeyRound, needs: "members_manage" },
  { href: "/espace/messages", key: "messages", icon: MessageSquare, needs: "messages_manage" },
  { href: "/espace/groupes", key: "groups", icon: MessagesSquare, needs: "groups_manage" },
  { href: "/espace/notifications", key: "notifications", icon: Bell, needs: "notifications_send" },
  { href: "/espace/lives", key: "lives", icon: Radio, needs: "lives_manage" },
  { href: "/espace/videos", key: "videos", icon: PlayCircle, needs: "videos_manage" },
  { href: "/espace/equipe", key: "team", icon: UsersRound, needs: "owner" },
];

export function AppShell({
  staff,
  unreadMessages,
  pendingRequests,
  children,
}: {
  staff: ShellStaff;
  /** conversations waiting for an answer (only counted for staff who may read messages) */
  unreadMessages: number;
  /** unlock requests waiting for an answer (only counted for staff who may answer them) */
  pendingRequests: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("space");
  const c = useTranslations("common");
  const navT = useTranslations("nav");
  const pathname = usePathname();

  // unread conversations: the server's number, kept fresh by polling once a minute
  const canReadMessages = staff.isOwner || staff.permissions.includes("messages_manage");
  const [polledInbox, setPolledInbox] = useState<{ base: number; value: number } | null>(null);
  const inbox = polledInbox && polledInbox.base === unreadMessages ? polledInbox.value : unreadMessages;
  useEffect(() => {
    if (!canReadMessages) return;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        const data = (await res.json()) as { inbox: number };
        if (alive) setPolledInbox({ base: unreadMessages, value: data.inbox });
      } catch {
        /* offline: keep the last number */
      }
    };
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [canReadMessages, unreadMessages]);

  // The drawer is "open" only for the page it was opened on, so navigating
  // closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  const visible = NAV.filter(
    (n) =>
      !n.needs ||
      staff.isOwner ||
      (n.needs !== "owner" && staff.permissions.includes(n.needs)),
  );
  const isActive = (n: (typeof NAV)[number]) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href);
  const onProfile = pathname.startsWith("/espace/profil");
  const active = visible.find(isActive);
  const currentLabel = onProfile
    ? t("nav.profile")
    : active
      ? t(`nav.${active.key}`)
      : t("nav.workspace");

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-ivory-50 lg:grid lg:grid-cols-[16.5rem_1fr]">
        {/* sidebar (drawer on mobile) */}
        <aside
          className={cn(
            "fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-ink-950 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0 lg:rtl:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Logo tone="dark" href="/espace" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full text-ink-300 hover:bg-white/10 lg:hidden"
              aria-label={c("close")}
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-4 flex-1 space-y-1 px-3" aria-label={t("nav.workspace")}>
            {visible.map((n) => {
              const current = isActive(n);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[0.9375rem] font-semibold transition-colors",
                    current ? "bg-jade-600 text-white" : "text-ink-300 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {t(`nav.${n.key}`)}
                  {n.key === "requests" && pendingRequests > 0 && (
                    <span
                      className="ms-auto grid min-w-[22px] place-items-center rounded-full bg-gold-400 px-1.5 text-[0.6875rem] font-bold leading-[22px] text-ink-950"
                      aria-label={t("requests.waiting", { count: pendingRequests })}
                    >
                      {pendingRequests > 99 ? "99+" : pendingRequests}
                    </span>
                  )}
                  {n.key === "messages" && inbox > 0 && (
                    <span
                      className="ms-auto grid min-w-[22px] place-items-center rounded-full bg-live px-1.5 text-[0.6875rem] font-bold leading-[22px] text-white"
                      aria-label={t("messages.unread", { count: inbox })}
                    >
                      {inbox > 99 ? "99+" : inbox}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-white/10 p-3">
            <Link
              href="/espace/profil"
              aria-current={onProfile ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold",
                onProfile ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/8 hover:text-white",
              )}
            >
              <UserCog className="size-[18px]" aria-hidden /> {t("nav.profile")}
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-300 hover:bg-white/8 hover:text-white"
            >
              <ExternalLink className="size-[18px]" aria-hidden /> {t("nav.publicSite")}
            </Link>
            <div className="flex items-center gap-3 rounded-xl px-3.5 py-3">
              <Avatar name={staff.name} hue={165} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{staff.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-ink-400">
                  {staff.isOwner && <ShieldCheck className="size-3 text-gold-400" aria-hidden />}
                  {staff.isOwner ? t("owner") : t("staff")}
                </p>
              </div>
              <form action={logoutStaffAction}>
                <button
                  type="submit"
                  className="grid size-9 place-items-center rounded-full text-ink-400 hover:bg-white/10 hover:text-white"
                  aria-label={c("logout")}
                >
                  <LogOut className="size-[18px] flip-rtl" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={c("close")}
          />
        )}

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-ivory-50/85 px-5 backdrop-blur-xl sm:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-ms-2 grid size-11 place-items-center rounded-full text-ink-900 hover:bg-ivory-200/60 lg:hidden"
              aria-label={navT("openMenu")}
            >
              <Menu className="size-6" />
            </button>
            <p className="font-display text-lg font-semibold">{currentLabel}</p>
            <div className="ms-auto flex items-center gap-1">
              <AppearanceMenu tone="light" />
              <LanguageSwitcher tone="light" />
            </div>
          </header>

          <main className="flex-1 px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
