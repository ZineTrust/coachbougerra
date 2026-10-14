import "server-only";

/*
  In-memory attempt limiter (per server process). It slows down password
  guessing — important because member numbers are sequential and guessable.
  With several server instances, move this to the database or a shared cache.
*/

const globalForLimit = globalThis as unknown as {
  __coachBougerraHits?: Map<string, number[]>;
};
const hits = (globalForLimit.__coachBougerraHits ??= new Map<string, number[]>());

/** Records an attempt and returns false when `key` exceeded `max` in `windowMs`. */
export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return recent.length <= max;
}

export function reset(key: string) {
  hits.delete(key);
}
