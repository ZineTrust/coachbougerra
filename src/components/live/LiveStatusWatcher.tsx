"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Keeps the page of a live up to date without a reload: when the host starts (or ends) the live, the page
 * redraws by itself and the room appears. It asks often when the start is close, rarely when it is far.
 */
export function LiveStatusWatcher({ liveId, status, startsAt }: { liveId: string; status: string; startsAt: string }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch(`/api/lives/${encodeURIComponent(liveId)}/status`, { cache: "no-store" });
          const data = (await response.json()) as { status?: string };
          if (!stopped && data.status && data.status !== status) router.refresh();
        } catch {
          // offline for a moment: the next check will do
        }
      }
      const untilStart = new Date(startsAt).getTime() - Date.now();
      timer = setTimeout(check, untilStart < 45 * 60_000 ? 12_000 : 60_000);
    };

    const wake = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void check();
      }
    };
    timer = setTimeout(check, 12_000);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [liveId, status, startsAt, router]);

  return null;
}
