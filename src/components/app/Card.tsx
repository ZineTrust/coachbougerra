import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 sm:p-6", className)}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AppPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
