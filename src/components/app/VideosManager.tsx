"use client";

import { useActionState, useState } from "react";
import { Check, ExternalLink, Eye, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setVideoPvAction, setVideoSourceAction } from "@/actions/unlocks";
import { initialState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { useErrorText } from "@/components/ui/form";
import { Thumb } from "@/components/video/Thumb";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { MAX_PV } from "@/lib/unlock";
import { cn, formatDaysAgo, formatDuration, formatNumber } from "@/lib/utils";

type Filter = "all" | "published" | "draft";

/** How much PV this formation needs. 0 = free. Saved straight away, applies to everyone. */
function PvEditor({ slug, pv }: { slug: string; pv: number }) {
  const t = useTranslations("space.videos");
  const err = useErrorText();
  const [state, action, pending] = useActionState(setVideoPvAction, initialState);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex items-center gap-2">
        <span className="text-xs font-semibold text-ink-500">{t("pvLabel")}</span>
        <input
          // a new value saved by someone else starts the field over
          key={pv}
          dir="ltr"
          name="pv"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_PV}
          step={1}
          required
          defaultValue={state.values?.pv ?? pv}
          aria-label={t("pvLabel")}
          aria-invalid={state.errors?.pv ? true : undefined}
          className="h-9 w-24 rounded-lg bg-white px-3 text-start text-sm font-bold tabular-nums ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-jade-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-jade-50 px-3 text-sm font-semibold text-jade-700 hover:bg-jade-100 disabled:opacity-50"
      >
        {t("pvSave")}
      </button>
      {state.ok && !pending && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-jade-700" role="status">
          <Check className="size-3.5" strokeWidth={3} aria-hidden /> {t("pvSaved")}
        </span>
      )}
      {(state.errors?.pv || state.errors?.form) && (
        <span role="alert" className="text-xs font-semibold text-live">
          {err(state.errors?.pv ?? state.errors?.form)}
        </span>
      )}
    </form>
  );
}

/** Where the video is hosted: staff paste a YouTube or Vimeo link. Empty = no video yet. */
function LinkEditor({ slug, link }: { slug: string; link: string }) {
  const t = useTranslations("space.videos");
  const err = useErrorText();
  const [state, action, pending] = useActionState(setVideoSourceAction, initialState);
  const shown = state.values?.link ?? link;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex min-w-0 flex-1 basis-72 items-center gap-2">
        <Link2 className="size-4 shrink-0 text-ink-400" aria-hidden />
        <input
          key={shown}
          dir="ltr"
          name="link"
          type="text"
          inputMode="url"
          autoComplete="off"
          maxLength={300}
          defaultValue={shown}
          placeholder={t("linkPlaceholder")}
          aria-label={t("linkLabel")}
          aria-invalid={state.errors?.link ? true : undefined}
          className="h-9 min-w-0 flex-1 rounded-lg bg-white px-3 text-start text-sm ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-jade-50 px-3 text-sm font-semibold text-jade-700 hover:bg-jade-100 disabled:opacity-50"
      >
        {t("linkSave")}
      </button>
      {state.ok && !pending && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-jade-700" role="status">
          <Check className="size-3.5" strokeWidth={3} aria-hidden /> {shown ? t("linkSaved") : t("linkRemoved")}
        </span>
      )}
      {(state.errors?.link || state.errors?.form) && (
        <span role="alert" className="text-xs font-semibold text-live">
          {err(state.errors?.link ?? state.errors?.form)}
        </span>
      )}
    </form>
  );
}

export function VideosManager({ videos, links }: { videos: Video[]; /** slug -> the video link already saved */ links: Record<string, string> }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: videos.length,
    published: videos.filter((v) => v.status === "published").length,
    draft: videos.filter((v) => v.status === "draft").length,
  };
  const shown = filter === "all" ? videos : videos.filter((v) => v.status === filter);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: t("space.videos.tabAll") },
    { id: "published", label: t("space.videos.tabPublished") },
    { id: "draft", label: t("space.videos.tabDrafts") },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
      <div className="flex gap-1 border-b border-ink-100 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              filter === tab.id ? "bg-jade-50 text-jade-700" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {tab.label} <span className="ms-1 text-xs opacity-70">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      <ul className="divide-y divide-ink-100">
        {shown.map((v) => (
          <li key={v.slug} className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                <Thumb video={v} showBadges={false} showPlay={false} />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[15px] font-bold leading-snug">{v.title[locale]}</p>
                <p className="mt-1 text-sm text-ink-500">
                  {t(`categories.${v.category}`)} · <bdi>{formatDuration(v.duration)}</bdi>
                  {v.status === "published" && ` · ${formatDaysAgo(v.daysAgo, locale)}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
              <PvEditor slug={v.slug} pv={v.pv} />
              <Badge tone={v.status === "published" ? "free" : "neutral"}>
                {v.status === "published" ? t("space.videos.published") : t("space.videos.draft")}
              </Badge>
              <span className="inline-flex min-w-16 items-center gap-1.5 text-sm text-ink-500">
                <Eye className="size-4" aria-hidden />
                {formatNumber(v.views)}
              </span>
              {v.status === "published" ? (
                <Link
                  href={`/videos/${v.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-jade-700 hover:text-jade-600"
                >
                  {t("space.videos.view")} <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              ) : (
                <span className="w-10" aria-hidden />
              )}
            </div>
            </div>
            <LinkEditor slug={v.slug} link={links[v.slug] ?? ""} />
          </li>
        ))}
      </ul>
    </div>
  );
}
