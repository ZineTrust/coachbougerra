"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  appearanceSnapshot,
  applyAppearance,
  parseAppearance,
  saveAppearance,
  serverAppearanceSnapshot,
  subscribeAppearance,
  type Appearance,
  type TextSize,
  type ThemePref,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "auto", icon: Monitor },
] as const satisfies readonly { value: ThemePref; icon: typeof Sun }[];

const TEXT_OPTIONS = [
  { value: "md", letter: "text-sm" },
  { value: "lg", letter: "text-lg" },
  { value: "xl", letter: "text-2xl" },
] as const satisfies readonly { value: TextSize; letter: string }[];

/** One row of mutually exclusive choices, in the look of the site's other segmented controls. */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; content: React.ReactNode }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-full bg-ivory-200/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-all",
            value === o.value ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {o.content}
        </button>
      ))}
    </div>
  );
}

/** Theme and text size. Used in the little menu of the headers and in the account page. */
export function AppearanceControls() {
  const t = useTranslations("appearance");
  // what this device saved (only known in the browser: the server renders the defaults)
  const look = parseAppearance(useSyncExternalStore(subscribeAppearance, appearanceSnapshot, serverAppearanceSnapshot));

  // "auto" follows the phone, also while the page is open
  useEffect(() => {
    if (look.theme !== "auto") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyAppearance(look);
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [look]);

  const choose = (change: Partial<Appearance>) => {
    saveAppearance({ ...look, ...change });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-bold">{t("themeTitle")}</p>
        <Segmented
          label={t("themeTitle")}
          value={look.theme}
          onChange={(theme) => choose({ theme })}
          options={THEME_OPTIONS.map(({ value, icon: Icon }) => ({
            value,
            label: t(`theme.${value}`),
            content: (
              <>
                <Icon className="size-4" aria-hidden /> <span>{t(`theme.${value}`)}</span>
              </>
            ),
          }))}
        />
        {look.theme === "auto" && <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">{t("autoHelp")}</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">{t("textTitle")}</p>
        <Segmented
          label={t("textTitle")}
          value={look.text}
          onChange={(text) => choose({ text })}
          options={TEXT_OPTIONS.map(({ value, letter }) => ({
            value,
            label: t(`text.${value}`),
            content: <span className={cn("font-bold leading-none", letter)}>A</span>,
          }))}
        />
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{t("sample")}</p>
      </div>
    </div>
  );
}

/** The header button that opens the appearance choices. */
export function AppearanceMenu({
  tone = "dark",
  up = false,
  className,
}: {
  /** dark = for dark backgrounds, light = for light ones */
  tone?: "dark" | "light";
  /** open upwards (when the button sits at the bottom of a menu) */
  up?: boolean;
  className?: string;
}) {
  const t = useTranslations("appearance");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("menu")}
        title={t("menu")}
        className={cn(
          "grid size-10 place-items-center rounded-full transition-colors",
          tone === "dark"
            ? "text-ink-200 hover:bg-white/10 hover:text-white"
            : "text-ink-600 hover:bg-ivory-200/60 hover:text-ink-900",
        )}
      >
        <SunMoon className="size-5" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("menu")}
          className={cn(
            "absolute end-0 z-50 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white p-5 text-start text-ink-900 shadow-stage ring-1 ring-ink-900/10",
            up ? "bottom-12" : "top-12",
          )}
        >
          <AppearanceControls />
        </div>
      )}
    </div>
  );
}
