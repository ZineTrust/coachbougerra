import { Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { Thumb } from "./Thumb";

export function VideoCard({ video, unlocked = false }: { video: Video; unlocked?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const free = video.pv === 0;
  return (
    <Link
      href={`/videos/${video.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <Thumb video={video} unlocked={unlocked} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-jade-600">
            {t(`categories.${video.category}`)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-ink-900">
            {video.title[locale]}
          </h3>
        </div>
        <div className="mt-auto flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-ink-500">
            <Eye className="size-4" aria-hidden />
            {formatNumber(video.views)}
          </span>
          <span
            dir="ltr"
            className={
              free || unlocked
                ? "font-bold text-jade-600"
                : "rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-ink-900"
            }
          >
            {free ? t("common.free") : unlocked ? t("common.unlocked") : t("common.pv", { pv: video.pv })}
          </span>
        </div>
      </div>
    </Link>
  );
}
