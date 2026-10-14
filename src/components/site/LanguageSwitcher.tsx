"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Switches between French and Arabic on the very same page.
 * It shows the name of the OTHER language, written in that language.
 */
export function LanguageSwitcher({
  className,
  tone = "dark",
}: {
  className?: string;
  /** dark = for dark backgrounds, light = for light ones */
  tone?: "dark" | "light";
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === "fr" ? "ar" : "fr";

  return (
    <button
      type="button"
      lang={other}
      aria-label={t("switchLanguage")}
      onClick={() => {
        // keep the page and any ?query (e.g. ?mode=register) when switching
        const search = window.location.search;
        router.replace(`${pathname}${search}`, { locale: other });
      }}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors",
        tone === "dark"
          ? "text-ink-200 hover:bg-white/10 hover:text-white"
          : "text-ink-600 hover:bg-ivory-200/60 hover:text-ink-900",
        className,
      )}
    >
      <Languages className="size-[18px]" aria-hidden />
      {t("otherLanguage")}
    </button>
  );
}
