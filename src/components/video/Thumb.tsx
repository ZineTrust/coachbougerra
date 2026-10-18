import {
  Brain,
  Crown,
  Handshake,
  Leaf,
  Lock,
  Network,
  Play,
  type LucideIcon,
} from "lucide-react";
import { AccessBadge } from "@/components/ui/Badge";
import type { Video, VideoCategory } from "@/lib/data";
import { cn, formatDuration } from "@/lib/utils";

export const CATEGORY_ICON: Record<VideoCategory, LucideIcon> = {
  network: Network,
  leadership: Crown,
  prospecting: Handshake,
  mindset: Brain,
  products: Leaf,
};

/**
 * The picture of a formation: its cover image when the team added one, otherwise a
 * coloured gradient (a colour per formation) with the category icon.
 */
export function Thumb({
  video,
  className,
  showPlay = true,
  showBadges = true,
  fill = false,
  unlocked = false,
}: {
  video: Pick<Video, "slug" | "hue" | "category" | "duration" | "pv" | "coverVersion">;
  className?: string;
  showPlay?: boolean;
  showBadges?: boolean;
  /** fill the parent instead of forcing a 16:9 box */
  fill?: boolean;
  /** the viewer already has access to this formation */
  unlocked?: boolean;
}) {
  const Icon = CATEGORY_ICON[video.category];
  const locked = video.pv > 0 && !unlocked;
  const hasCover = video.coverVersion !== null;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        fill ? "size-full" : "aspect-video",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${video.hue} 58% 30%), hsl(${video.hue + 35} 55% 13%))`,
      }}
    >
      {hasCover ? (
        <>
          {/* a plain <img>: the cover is a small JPEG served by our own route */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/video-cover/${encodeURIComponent(video.slug)}?v=${video.coverVersion}`}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/55 to-transparent" aria-hidden />
        </>
      ) : (
        <>
          <div
            className="absolute -end-10 -top-10 size-56 rounded-full opacity-40 blur-2xl"
            style={{ background: `hsl(${video.hue} 80% 55%)` }}
            aria-hidden
          />
          <div className="dots absolute inset-0 opacity-70" aria-hidden />
          <Icon
            className="absolute -bottom-4 -start-2 size-28 text-white/[0.09]"
            strokeWidth={1.25}
            aria-hidden
          />
        </>
      )}

      {showPlay && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-white/95 text-ink-900 shadow-lg transition-transform duration-300 group-hover:scale-110">
            {locked ? (
              <Lock className="size-5" aria-hidden />
            ) : (
              <Play className="ms-0.5 size-5 fill-current" aria-hidden />
            )}
          </span>
        </span>
      )}

      {showBadges && (
        <>
          <span className="absolute start-3 top-3">
            <AccessBadge pv={video.pv} unlocked={unlocked} onDark />
          </span>
          {video.duration > 0 && (
            <span
              dir="ltr"
              className="absolute bottom-3 end-3 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white backdrop-blur"
            >
              {formatDuration(video.duration)}
            </span>
          )}
        </>
      )}
    </div>
  );
}
