"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarPlus, Check, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toggleReservationAction } from "@/actions/progress";
import { Button, type ButtonSize } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface Props {
  liveId: string;
  /** the occurrence being reserved, as an ISO date */
  startsAt: string;
  /** a live with reserved access: the button is gold and needs the team's permission */
  premium: boolean;
  signedIn: boolean;
  /** false for a premium live the member has no access to yet */
  allowed: boolean;
  reserved: boolean;
  /** how many people reserved this occurrence */
  count?: number;
  size?: ButtonSize;
  /** the button sits on a dark background */
  onDark?: boolean;
  className?: string;
}

/** Reserve (or cancel) a place at one live, add it to the calendar, see how many are coming. */
export function ReserveButton({
  liveId,
  startsAt,
  premium,
  signedIn,
  allowed,
  reserved,
  count = 0,
  size = "sm",
  onDark = false,
  className,
}: Props) {
  const t = useTranslations("reserve");
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // shows the new state at once; it falls back to the server's value when the action ends
  const [shown, setShown] = useOptimistic(reserved);

  const muted = onDark ? "text-ink-300" : "text-ink-500";

  if (!signedIn) {
    return (
      <Button
        href="/connexion"
        size={size}
        variant={premium ? "gold" : "primary"}
        className={className}
      >
        {t("button")}
      </Button>
    );
  }

  if (!allowed) {
    return (
      <p className={cn("flex items-start gap-2 text-sm leading-snug", muted, className)}>
        <Lock className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
        {t("premium")}
      </p>
    );
  }

  const toggle = (next: boolean) => {
    setFailed(false);
    startTransition(async () => {
      setShown(next);
      const result = await toggleReservationAction(liveId, startsAt, next);
      if (!result.ok) setFailed(true);
    });
  };

  const total = Math.max(0, count + (shown === reserved ? 0 : shown ? 1 : -1));
  const calendarHref = `/api/calendar.ics?live=${encodeURIComponent(liveId)}&once=1&lang=${locale}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {shown ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-jade-50 px-4 text-sm font-semibold text-jade-700">
            <Check className="size-4" strokeWidth={3} aria-hidden /> {t("done")}
          </span>
          <a
            href={calendarHref}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline",
              onDark ? "text-jade-300" : "text-jade-700",
            )}
          >
            <CalendarPlus className="size-4" aria-hidden /> {t("addToCalendar")}
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => toggle(false)}
            className={cn("text-sm underline-offset-4 hover:underline disabled:opacity-50", muted)}
          >
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div>
          <Button
            size={size}
            variant={premium ? "gold" : "primary"}
            disabled={pending}
            onClick={() => toggle(true)}
          >
            {t("button")}
          </Button>
        </div>
      )}
      {total > 0 && <p className={cn("text-[13px]", muted)}>{t("count", { count: total })}</p>}
      {failed && (
        <p role="alert" className="text-[13px] font-semibold text-live">
          {t("error")}
        </p>
      )}
    </div>
  );
}
