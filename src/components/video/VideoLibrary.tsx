"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { VIDEO_CATEGORIES, type Video, type VideoCategory } from "@/lib/data";
import { cn } from "@/lib/utils";
import { VideoCard } from "./VideoCard";

type Access = "all" | "free" | "pv";
const ACCESS: Access[] = ["all", "free", "pv"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-ink-900 text-white"
          : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ivory-100",
      )}
    >
      {children}
    </button>
  );
}

export function VideoLibrary({
  videos,
  unlockedSlugs = [],
}: {
  videos: Video[];
  /** formations the signed-in member can already watch */
  unlockedSlugs?: string[];
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [access, setAccess] = useState<Access>("all");
  const [category, setCategory] = useState<VideoCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (access === "free" && v.pv > 0) return false;
      if (access === "pv" && v.pv === 0) return false;
      if (category !== "all" && v.category !== category) return false;
      if (q && !v.title[locale].toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, access, category, query, locale]);

  return (
    <div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="inline-flex w-fit rounded-full bg-white p-1 ring-1 ring-ink-200"
            role="group"
            aria-label={t("library.accessLabel")}
          >
            {ACCESS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAccess(id)}
                aria-pressed={access === id}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                  access === id ? "bg-jade-600 text-white" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {t(`library.${id}`)}
              </button>
            ))}
          </div>

          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">{t("library.searchLabel")}</span>
            <Search
              className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("library.searchPlaceholder")}
              className="h-11 w-full rounded-full bg-white ps-11 pe-4 text-sm ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
            />
          </label>
        </div>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            {t("library.allCategories")}
          </Chip>
          {VIDEO_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {t(`categories.${c}`)}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mt-8 text-sm font-semibold text-ink-500" aria-live="polite">
        {t("library.count", { count: filtered.length })}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard key={v.slug} video={v} unlocked={unlockedSlugs.includes(v.slug)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-3xl bg-white px-6 py-20 text-center ring-1 ring-ink-900/5">
          <SearchX className="size-10 text-ink-300" aria-hidden />
          <p className="mt-4 text-lg font-bold">{t("library.emptyTitle")}</p>
          <p className="mt-1 text-ink-500">{t("library.emptyText")}</p>
          <button
            type="button"
            onClick={() => {
              setAccess("all");
              setCategory("all");
              setQuery("");
            }}
            className="mt-6 rounded-full bg-jade-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-jade-700"
          >
            {t("library.reset")}
          </button>
        </div>
      )}
    </div>
  );
}
