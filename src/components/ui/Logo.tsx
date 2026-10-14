import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    // Same drawing as src/app/icon.svg (the browser tab icon): keep the two in sync.
    <svg
      viewBox="0 0 64 64"
      className={cn("size-9", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fc196" />
          <stop offset="1" stopColor="#0a6a54" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#lm-g)" />
      {/* "CB" monogram */}
      <g fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M29.2 22.8A12 12 0 1 0 29.2 41.2" />
        <path d="M39.5 20v24M39.5 20h5.5a5 5 0 0 1 0 10h-5.5M39.5 30h6.5a7 7 0 0 1 0 14h-6.5" />
      </g>
      {/* live dot */}
      <circle cx="54" cy="10" r="5" fill="#f0435a" stroke="#0d1a2d" strokeWidth="2" />
    </svg>
  );
}

export function Logo({
  tone = "light",
  href = "/",
  className,
}: {
  /** "light" = for light backgrounds (dark text), "dark" = for dark backgrounds (white text) */
  tone?: "light" | "dark";
  href?: string;
  className?: string;
}) {
  const t = useTranslations("nav");
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={t("home")}
    >
      <LogoMark />
      {/* the brand name stays in Latin letters and in Fraunces, in every language */}
      <span
        dir="ltr"
        className={cn(
          "text-[1.35rem] font-semibold leading-none tracking-tight",
          tone === "dark" ? "text-white" : "text-ink-900",
        )}
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        Coach <span className="italic text-jade-500">Bougerra</span>
      </span>
    </Link>
  );
}
