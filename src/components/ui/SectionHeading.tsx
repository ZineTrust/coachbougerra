import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  tone = "light",
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  action?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p
            className={cn(
              "mb-3 text-xs font-bold uppercase tracking-[0.18em]",
              dark ? "text-gold-400" : "text-jade-600",
            )}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl",
            dark ? "text-white" : "text-ink-900",
          )}
        >
          {title}
        </h2>
        {lead && (
          <p
            className={cn(
              "mt-4 text-base leading-relaxed sm:text-lg",
              dark ? "text-ink-300" : "text-ink-500",
            )}
          >
            {lead}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
