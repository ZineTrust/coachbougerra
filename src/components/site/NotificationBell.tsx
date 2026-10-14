"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { markAllReadAction } from "@/actions/notifications";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn, formatDateTime } from "@/lib/utils";

interface Item {
  id: number;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/**
 * Bell with an unread badge. A click opens a panel with the latest
 * notifications from the team (no page change).
 */
export function NotificationBell({ initial }: { initial: number }) {
  const t = useTranslations("nav");
  const b = useTranslations("bell");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // The server sends the count; polling keeps it fresh. We remember which server
  // value the polled number belongs to, so a fresh page load always wins.
  const [polled, setPolled] = useState<{ base: number; value: number } | null>(null);
  const count = polled && polled.base === initial ? polled.value : initial;

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        const data = (await res.json()) as { count: number };
        if (alive) setPolled({ base: initial, value: data.count });
      } catch {
        /* offline: keep the last number */
      }
    };
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [initial]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { count: number; items: Item[] };
      setItems(data.items);
      setPolled({ base: initial, value: data.count });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [initial]);

  // close on Escape or a click outside the panel
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

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const markAll = () =>
    startTransition(async () => {
      await markAllReadAction();
      setItems((prev) => prev?.map((i) => ({ ...i, read: true })) ?? prev);
      setPolled({ base: initial, value: 0 });
      router.refresh();
    });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("notifications", { count })}
        className="relative grid size-10 place-items-center rounded-full text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-live px-1 text-[10px] font-bold leading-[18px] text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={b("title")}
          className="fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl bg-white text-ink-900 shadow-stage ring-1 ring-ink-900/10 sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[24rem]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <p className="font-bold">{b("title")}</p>
            {count > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-jade-700 hover:bg-jade-50"
              >
                <CheckCheck className="size-3.5" aria-hidden /> {b("markAll")}
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto">
            {items === null && !failed && (
              <p className="px-4 py-8 text-center text-sm text-ink-500">{b("loading")}</p>
            )}
            {failed && items === null && (
              <p className="px-4 py-8 text-center text-sm text-ink-500">{b("loadError")}</p>
            )}
            {items?.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-ink-500">{b("empty")}</p>
            )}
            {items && items.length > 0 && (
              <ul className="divide-y divide-ink-100">
                {items.map((n) => (
                  <li key={n.id} className={cn("px-4 py-3.5", !n.read && "bg-jade-50/60")}>
                    <div className="flex items-start gap-2.5">
                      {!n.read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-live" aria-label={b("newBadge")} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p dir="auto" className="text-[14px] font-bold leading-snug">{n.title}</p>
                        <p dir="auto" className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] leading-snug text-ink-600">
                          {n.body}
                        </p>
                        <p className="mt-1.5 text-[11px] text-ink-400">
                          {formatDateTime(new Date(n.createdAt), locale)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/compte#notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-ink-100 px-4 py-3 text-center text-sm font-bold text-jade-700 hover:bg-ivory-50"
          >
            {b("seeAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
