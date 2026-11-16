import {
  cancelHomeUploadAction,
  finishHomeUploadAction,
  signHomePartsAction,
  startHomeUploadAction,
} from "@/actions/home-videos";
import { UploadCancelled, uploadParts } from "@/lib/upload-parts";
import { readMeta, type UploadOutcome, type UploadPhase } from "@/lib/upload-video";
import { videoFileType } from "@/lib/video-source";

/*
  Sending one short video for the top of the home page, start to finish, from the browser (same way as a
  formation's video: in pieces, straight to the storage). Browser only.
*/

export async function uploadHomeVideo(o: {
  file: File;
  maxBytes: number;
  signal: AbortSignal;
  onPhase: (phase: UploadPhase) => void;
}): Promise<UploadOutcome> {
  if (o.file.size > o.maxBytes) return { ok: false, error: "home_video_too_big" };
  if (!videoFileType(o.file.name)) return { ok: false, error: "unsupported_video" };

  o.onPhase({ name: "preparing" });
  try {
    const meta = await readMeta(o.file);
    // a video this browser cannot play will not play for the visitors either
    if (!meta.playable) return { ok: false, error: "unsupported_video" };

    const started = await startHomeUploadAction({ name: o.file.name, size: o.file.size });
    if (!started.ok) return { ok: false, error: started.error };

    const total = o.file.size;
    o.onPhase({ name: "sending", sent: 0, total });
    try {
      await uploadParts({
        file: o.file,
        partSize: started.partSize,
        partCount: started.partCount,
        done: [],
        urls: started.urls,
        refreshUrls: async (numbers) => {
          const fresh = await signHomePartsAction(started.key, started.uploadId, total, numbers);
          if (!fresh.ok) throw new Error(fresh.error);
          return fresh.urls;
        },
        onProgress: (sent) => o.onPhase({ name: "sending", sent, total }),
        signal: o.signal,
      });
    } catch (error) {
      // nothing is kept of a send that stopped: the half-sent file is thrown away
      await cancelHomeUploadAction(started.key, started.uploadId);
      throw error;
    }

    o.onPhase({ name: "finishing" });
    const finished = await finishHomeUploadAction(started.key, started.uploadId, total);
    return finished.ok ? { ok: true, playable: true } : { ok: false, error: finished.error };
  } catch (error) {
    if (error instanceof UploadCancelled) return { ok: false, error: "cancelled" };
    console.error("[home-video-upload]", error);
    return { ok: false, error: "upload_stopped" };
  }
}
