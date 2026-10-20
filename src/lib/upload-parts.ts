/*
  Sends a big file to the storage in pieces, from the browser, to signed addresses the website
  handed out. Made for a phone on a mobile connection: a few pieces travel at once, each piece is
  retried on its own (with a growing pause, and only while the phone is online), a signed address
  that ran out is replaced, and a piece that makes no progress for a while is started again. A
  dropped connection therefore costs one piece, never the whole video.
*/

/** The upload was stopped on purpose. */
export class UploadCancelled extends Error {
  constructor() {
    super("upload cancelled");
  }
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export interface UploadOptions {
  file: Blob;
  partSize: number;
  partCount: number;
  /** pieces the storage already has */
  done: number[];
  /** signed address per piece still to send */
  urls: Record<number, string>;
  /** new signed addresses for some pieces (the first ones ran out) */
  refreshUrls: (numbers: number[]) => Promise<Record<number, string>>;
  /** bytes of the file safely sent so far */
  onProgress: (sentBytes: number) => void;
  signal: AbortSignal;
  /** pieces in flight together (default 3) */
  concurrency?: number;
}

const ATTEMPTS = 8;
const STALL_MS = 45_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new UploadCancelled());
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new UploadCancelled());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Waits until the phone has a connection again. */
function whenOnline(signal: AbortSignal): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => {
      window.removeEventListener("online", onOnline);
      signal.removeEventListener("abort", onAbort);
    };
    const onOnline = () => {
      done();
      resolve();
    };
    const onAbort = () => {
      done();
      reject(new UploadCancelled());
    };
    window.addEventListener("online", onOnline, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** One PUT of one piece. Rejects with HttpError (status 0 = the network failed or stalled). */
function putPiece(url: string, piece: Blob, onLoaded: (bytes: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new UploadCancelled());
    const xhr = new XMLHttpRequest();
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const finish = (settle: () => void) => {
      clearTimeout(watchdog);
      signal.removeEventListener("abort", onAbort);
      settle();
    };
    const arm = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        xhr.abort();
        finish(() => reject(new HttpError(0)));
      }, STALL_MS);
    };
    const onAbort = () => {
      xhr.abort();
      finish(() => reject(new UploadCancelled()));
    };

    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      arm();
      onLoaded(e.loaded);
    };
    xhr.onload = () =>
      finish(() => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new HttpError(xhr.status))));
    xhr.onerror = () => finish(() => reject(new HttpError(0)));
    signal.addEventListener("abort", onAbort, { once: true });
    arm();
    xhr.send(piece);
  });
}

export async function uploadParts(o: UploadOptions): Promise<void> {
  const total = o.file.size;
  const bounds = (n: number): [number, number] => [(n - 1) * o.partSize, Math.min(n * o.partSize, total)];

  const sent = new Map<number, number>();
  for (const n of o.done) {
    const [from, to] = bounds(n);
    sent.set(n, to - from);
  }
  const report = () => {
    let sum = 0;
    for (const bytes of sent.values()) sum += bytes;
    o.onProgress(Math.min(total, sum));
  };
  report();

  // stops the other pieces too when one gives up for good, or when the caller cancels
  const stop = new AbortController();
  const onOuterAbort = () => stop.abort();
  if (o.signal.aborted) stop.abort();
  else o.signal.addEventListener("abort", onOuterAbort, { once: true });
  const signal = stop.signal;

  const urls = { ...o.urls };
  const queue: number[] = [];
  for (let n = 1; n <= o.partCount; n += 1) if (!o.done.includes(n)) queue.push(n);

  const sendPiece = async (n: number) => {
    const [from, to] = bounds(n);
    const piece = o.file.slice(from, to);
    let refusals = 0;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      await whenOnline(signal);
      try {
        await putPiece(
          urls[n],
          piece,
          (loaded) => {
            sent.set(n, Math.min(loaded, to - from));
            report();
          },
          signal,
        );
        sent.set(n, to - from);
        report();
        return;
      } catch (error) {
        if (error instanceof UploadCancelled) throw error;
        sent.set(n, 0);
        report();
        if (error instanceof HttpError && error.status === 403) {
          // the signed address ran out (or was refused): get a new one, but give up if a new one is refused too
          refusals += 1;
          if (refusals > 1) throw new Error("The storage refused the piece (check its CORS rule and keys).");
          Object.assign(urls, await o.refreshUrls([n]));
          continue;
        }
        if (attempt === ATTEMPTS - 1) throw error;
        const pause = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
        await sleep(pause, signal);
      }
    }
  };

  let failure: unknown = null;
  const worker = async () => {
    for (;;) {
      if (failure) return;
      const n = queue.shift();
      if (n === undefined) return;
      try {
        await sendPiece(n);
      } catch (error) {
        failure ??= error;
        stop.abort();
        return;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(o.concurrency ?? 3, queue.length || 1) }, worker));
  } finally {
    o.signal.removeEventListener("abort", onOuterAbort);
  }
  if (failure) throw failure;
  if (signal.aborted) throw new UploadCancelled();
}
