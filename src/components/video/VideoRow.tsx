import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { Thumb } from "./Thumb";

/** Compact horizontal card for sidebars. */
export function VideoRow({ video, unlocked = false }: { video: Video; unlocked?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const open = video.pv === 0 || unlocked;
  return (
    <Link
      href={`/videos/${video.slug}`}
      className="group flex gap-3.5 rounded-2xl p-2 transition-colors hover:bg-white"
    >
      <div className="w-36 shrink-0 overflow-hidden rounded-xl sm:w-40">
        <Thumb video={video} unlocked={unlocked} showBadges={false} showPlay={false} />
      </div>
      <div className="min-w-0 py-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-900 group-hover:text-jade-700">
          {video.title[locale]}
        </h3>
        <p className="mt-1.5 text-xs text-ink-500">{t(`categories.${video.category}`)}</p>
        <p dir="ltr" className={open ? "mt-1 text-xs font-bold text-jade-600" : "mt-1 text-xs font-bold text-ink-700"}>
          {video.pv === 0
            ? t("common.free")
            : unlocked
              ? t("common.unlocked")
              : t("common.pv", { pv: video.pv })}
        </p>
      </div>
    </Link>
  );
}
