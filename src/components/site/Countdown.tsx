"use client";

import { useTranslations } from "next-intl";
import { useNow } from "@/lib/useNow";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Counts down to `target` (ISO string). Renders neutral placeholders until the
 * clock is running so the server and browser HTML always match.
 */
export function Countdown({
  target,
  className,
  compact = false,
}: {
  target: string;
  className?: string;
  /** compact: "02:14:09" on one line, otherwise big labelled blocks */
  compact?: boolean;
}) {
  const t = useTranslations("countdown");
  const now = useNow(1000);

  const total =
    now === null ? null : Math.floor(Math.max(0, new Date(target).getTime() - now) / 1000);
  const parts =
    total === null
      ? null
      : {
          d: Math.floor(total / 86400),
          h: Math.floor((total % 86400) / 3600),
          m: Math.floor((total % 3600) / 60),
          s: total % 60,
        };

  if (compact) {
    return (
      <span dir="ltr" className={cn("inline-block tabular-nums", className)}>
        {parts
          ? `${parts.d > 0 ? `${parts.d}d ` : ""}${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}`
          : "--:--:--"}
      </span>
    );
  }

  const cells = [
    { label: t("days"), v: parts?.d },
    { label: t("hours"), v: parts?.h },
    { label: t("minutes"), v: parts?.m },
    { label: t("seconds"), v: parts?.s },
  ];

  return (
    <div className={cn("flex gap-2", className)} role="timer" aria-live="off">
      {cells.map((c) => (
        <div
          key={c.label}
          className="min-w-16 rounded-xl bg-white/8 px-3 py-2.5 text-center ring-1 ring-white/10"
        >
          <div className="font-display text-2xl font-semibold tabular-nums text-white">
            {c.v === undefined ? "--" : pad(c.v)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-300">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
