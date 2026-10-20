import {
  cancelVideoUploadAction,
  finishVideoUploadAction,
  signVideoPartsAction,
  startVideoUploadAction,
} from "@/actions/video-upload";
import { UploadCancelled, uploadParts } from "@/lib/upload-parts";
import { videoFileType } from "@/lib/video-source";

/*
  Sending one video file to a formation, start to finish, from the browser: checks the file, asks the
  website to open the upload, sends the pieces straight to the storage, then asks the website to close
  it and attach the video. Used by the formation page (add or replace a video) and by the new-formation
  form (create and send in one go). Browser only: it reads the file and talks to server actions.
*/

/** Where a send is at, for the progress display. "creating" is only used by the new-formation form. */
export type UploadPhase =
  | { name: "creating" }
  | { name: "preparing" }
  | { name: "sending"; sent: number; total: number }
  | { name: "finishing" };

/** `error` is an error code the interface can translate, "upload_stopped" (the connection gave up) or "cancelled". */
export type UploadOutcome = { ok: true; playable: boolean } | { ok: false; error: string };

/** The video's length, and whether this browser can play it (read from the file itself, nothing is sent). */
export function readMeta(file: File): Promise<{ seconds: number; playable: boolean }> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const address = URL.createObjectURL(file);
    const done = (value: { seconds: number; playable: boolean }) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(address);
      el.removeAttribute("src");
      el.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => done({ seconds: 0, playable: true }), 10_000);
    el.preload = "metadata";
    el.muted = true;
    el.onloadedmetadata = () =>
      done({ seconds: Number.isFinite(el.duration) ? Math.round(el.duration) : 0, playable: true });
    el.onerror = () => done({ seconds: 0, playable: false });
    el.src = address;
  });
}

/** Quick checks of a picked file, before anything is sent. Returns an error code or null. */
export function checkVideoFile(file: File, maxBytes: number): string | null {
  if (file.size > maxBytes) return "video_too_big";
  if (!videoFileType(file.name)) return "unsupported_video";
  return null;
}

export async function uploadVideoFile(o: {
  slug: string;
  file: File;
  maxBytes: number;
  signal: AbortSignal;
  onPhase: (phase: UploadPhase) => void;
}): Promise<UploadOutcome> {
  const problem = checkVideoFile(o.file, o.maxBytes);
  if (problem) return { ok: false, error: problem };

  o.onPhase({ name: "preparing" });
  try {
    const [meta, started] = await Promise.all([
      readMeta(o.file),
      startVideoUploadAction(o.slug, { name: o.file.name, size: o.file.size, lastModified: o.file.lastModified }),
    ]);
    if (!started.ok) return { ok: false, error: started.error };

    const total = o.file.size;
    o.onPhase({ name: "sending", sent: 0, total });
    await uploadParts({
      file: o.file,
      partSize: started.partSize,
      partCount: started.partCount,
      done: started.done,
      urls: started.urls,
      refreshUrls: async (numbers) => {
        const fresh = await signVideoPartsAction(o.slug, started.uploadId, numbers);
        if (!fresh.ok) throw new Error(fresh.error);
        return fresh.urls;
      },
      onProgress: (sent) => o.onPhase({ name: "sending", sent, total }),
      signal: o.signal,
    });

    o.onPhase({ name: "finishing" });
    const finished = await finishVideoUploadAction(o.slug, started.uploadId, meta.seconds);
    return finished.ok ? { ok: true, playable: meta.playable } : { ok: false, error: finished.error };
  } catch (error) {
    if (error instanceof UploadCancelled) {
      await cancelVideoUploadAction(o.slug);
      return { ok: false, error: "cancelled" };
    }
    console.error("[video-upload]", error);
    return { ok: false, error: "upload_stopped" };
  }
}
