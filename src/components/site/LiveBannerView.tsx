"use client";

import { useSyncExternalStore } from "react";
import { Radio, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Countdown } from "./Countdown";

const EVENT = "live-banner-dismissed";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * The strip across the top of the site: red while a live is on air, gold in the
 * hour before the next one. A visitor can close it for the rest of their visit.
 */
export function LiveBannerView({
  mode,
  title,
  startsAt,
  storageKey,
}: {
  mode: "live" | "soon";
  title: string;
  /** ISO date the next live starts (mode "soon") */
  startsAt?: string;
  /** changes whenever this is a new live, so a closed banner comes back for the next one */
  storageKey: string;
}) {
  const t = useTranslations("banner");
  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(storageKey) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );

  if (dismissed) return null;

  const close = () => {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* storage blocked: the banner simply stays */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  const live = mode === "live";

  return (
    <div
      role="status"
      className={cn(
        "relative z-[60] flex items-center justify-center gap-x-3 gap-y-1 px-12 py-2.5 text-sm font-semibold",
        live ? "bg-live text-white" : "bg-gold-400 text-ink-950",
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-wider">
        {live ? (
          <>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex size-2.5 rounded-full bg-white" />
            </span>
            {t("live")}
          </>
        ) : (
          <>
            <Radio className="size-3.5" aria-hidden /> {t("soon")}
          </>
        )}
      </span>
      <span dir="auto" className="min-w-0 truncate">
        {title}
      </span>
      {!live && startsAt && (
        <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
          {t("soonIn")} <Countdown target={startsAt} compact className="font-bold" />
        </span>
      )}
      <Link
        href="/lives"
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1 text-xs font-bold",
          live ? "bg-white text-live hover:bg-white/90" : "bg-ink-950 text-white hover:bg-ink-800",
        )}
      >
        {live ? t("join") : t("view")}
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label={t("dismiss")}
        className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-black/10"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
