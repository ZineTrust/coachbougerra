import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LIVES, upcomingLives } from "@/lib/data";
import { getLiveNow } from "@/server/engagement";
import { LiveBannerView } from "./LiveBannerView";

const SOON_WINDOW_MS = 60 * 60_000;

/** Decides whether the site-wide banner shows: a live on air, or one starting within the hour. */
export async function LiveBanner() {
  const locale = (await getLocale()) as Locale;
  const onAir = await getLiveNow();

  if (onAir) {
    const live = LIVES.find((l) => l.id === onAir.liveId);
    if (live) {
      return (
        <LiveBannerView
          mode="live"
          title={live.title[locale]}
          storageKey={`banner:live:${live.id}:${onAir.startedAt.getTime()}`}
        />
      );
    }
  }

  const now = new Date();
  const next = upcomingLives(now)[0];
  if (next && next.startsAt.getTime() - now.getTime() <= SOON_WINDOW_MS) {
    return (
      <LiveBannerView
        mode="soon"
        title={next.title[locale]}
        startsAt={next.startsAt.toISOString()}
        storageKey={`banner:soon:${next.id}:${next.startsAt.getTime()}`}
      />
    );
  }

  return null;
}
