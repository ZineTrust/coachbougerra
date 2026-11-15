import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { liveOnAir, upcomingLives } from "@/server/lives";
import { LiveBannerView } from "./LiveBannerView";

const SOON_WINDOW_MS = 60 * 60_000;

/**
 * Decides whether the site-wide banner shows: a live on air, or one starting within the hour.
 * Lives meant for the team only never show it.
 */
export async function LiveBanner() {
  const locale = (await getLocale()) as Locale;
  const onAir = await liveOnAir();

  if (onAir && onAir.access !== "team") {
    return (
      <LiveBannerView
        mode="live"
        title={onAir.title[locale]}
        href={`/lives/${onAir.id}`}
        storageKey={`banner:live:${onAir.id}:${onAir.startedAt.getTime()}`}
      />
    );
  }

  const now = new Date();
  const [next] = await upcomingLives({ limit: 1 });
  if (next && next.status === "scheduled" && next.startsAt.getTime() - now.getTime() <= SOON_WINDOW_MS) {
    return (
      <LiveBannerView
        mode="soon"
        title={next.title[locale]}
        startsAt={next.startsAt.toISOString()}
        href={`/lives/${next.id}`}
        storageKey={`banner:soon:${next.id}:${next.startsAt.getTime()}`}
      />
    );
  }

  return null;
}
