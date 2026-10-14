import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="stage relative overflow-hidden">
      <div
        className="dots absolute inset-0 [mask-image:radial-gradient(70%_90%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-200">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
