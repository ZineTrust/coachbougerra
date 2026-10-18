"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Eye, Pencil, Video as VideoIcon, VideoOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { moveVideoAction, setVideoPvAction, setVideoStatusAction } from "@/actions/videos";
import { initialState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { useErrorText } from "@/components/ui/form";
import { Thumb } from "@/components/video/Thumb";
import { Link, useRouter } from "@/i18n/navigation";
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

/** The list of formations: publish, reorder, change PV, open one to edit it. */
export function VideosManager({ videos }: { videos: Video[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();

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

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  if (videos.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-6 py-16 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
        {t("space.videos.empty")}
      </p>
    );
  }

  const arrow =
    "grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ivory-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent";

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
        {shown.map((v, i) => (
          <li key={v.slug} className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {filter === "all" && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className={arrow}
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveVideoAction(v.slug, "up"))}
                      aria-label={t("space.videos.moveUp")}
                      title={t("space.videos.moveUp")}
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={arrow}
                      disabled={pending || i === shown.length - 1}
                      onClick={() => run(() => moveVideoAction(v.slug, "down"))}
                      aria-label={t("space.videos.moveDown")}
                      title={t("space.videos.moveDown")}
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
                <div className="w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                  <Thumb video={v} showBadges={false} showPlay={false} />
                </div>
                <div className="min-w-0">
                  <p dir="auto" className="line-clamp-2 text-[15px] font-bold leading-snug">
                    {v.title[locale]}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {t(`categories.${v.category}`)}
                    {v.duration > 0 && (
                      <>
                        {" · "}
                        <bdi>{formatDuration(v.duration)}</bdi>
                      </>
                    )}
                    {v.status === "published" && ` · ${formatDaysAgo(v.daysAgo, locale)}`}
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1.5 text-xs font-semibold",
                      v.hasVideo ? "text-jade-700" : "text-gold-600",
                    )}
                  >
                    {v.hasVideo ? (
                      <VideoIcon className="size-3.5" aria-hidden />
                    ) : (
                      <VideoOff className="size-3.5" aria-hidden />
                    )}
                    {v.hasVideo ? t("space.videos.hasVideo") : t("space.videos.noVideo")}
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
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold">
              <Link
                href={`/espace/videos/${v.slug}`}
                className="inline-flex items-center gap-1.5 text-jade-700 hover:text-jade-600"
              >
                <Pencil className="size-3.5" aria-hidden /> {t("space.videos.edit")}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => setVideoStatusAction(v.slug, v.status === "published" ? "draft" : "published"))
                }
                className="text-ink-600 hover:text-ink-900 disabled:opacity-50"
              >
                {v.status === "published" ? t("space.videos.unpublish") : t("space.videos.publishNow")}
              </button>
              {v.status === "published" && (
                <Link href={`/videos/${v.slug}`} className="text-ink-500 hover:text-ink-900">
                  {t("space.videos.view")}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {filter === "all" && (
        <p className="border-t border-ink-100 px-5 py-3 text-[13px] text-ink-500">{t("space.videos.orderHelp")}</p>
      )}
    </div>
  );
}
