"use client";

import { useSyncExternalStore } from "react";

/*
  A shared, ticking "now". It returns null on the server and on the very first
  client render, so server HTML and hydration always agree, then the current
  time (ms) once the component is subscribed. One timer per tick length is
  shared by every component that uses it.
*/

function createClock(intervalMs: number) {
  let value = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();

  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      if (listeners.size === 1) {
        value = Date.now();
        timer = setInterval(() => {
          value = Date.now();
          listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) clearInterval(timer);
      };
    },
    // while nobody is subscribed the stored value may be stale, so report "unknown"
    getSnapshot: (): number | null => (listeners.size > 0 ? value : null),
  };
}

const clocks = {
  1000: createClock(1000),
  15000: createClock(15000),
} as const;

const getServerSnapshot = () => null;

export function useNow(tickMs: keyof typeof clocks): number | null {
  const clock = clocks[tickMs];
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerSnapshot);
}
