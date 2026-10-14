"use client";

import { useEffect } from "react";

/** Registers the service worker (offline page + push notifications). Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* not available here (private mode, old browser): the site works without it */
    });
  }, []);
  return null;
}
