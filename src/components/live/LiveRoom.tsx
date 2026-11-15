"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Mic, MicOff, PhoneOff, Radio, Video, VideoOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { DisconnectReason, Room, RoomEvent, VideoPresets } from "livekit-client";
import { endLiveAction, startLiveAction } from "@/actions/lives";
import { LiveDot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckRow, Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { RoomView } from "./RoomView";

type Phase = "idle" | "connecting" | "live" | "left" | "ended" | "kicked" | "lost";

/** The camera of the host, shown before going live so the framing and the light can be checked. */
function HostPreview({ cam, mic, onCam, onMic }: { cam: boolean; mic: boolean; onCam: () => void; onMic: () => void }) {
  const t = useTranslations("liveRoom");
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    if (!cam) return;
    const el = video.current;
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        const got = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
        if (stopped) {
          got.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = got;
        setProblem(false);
        if (el) el.srcObject = got;
      } catch {
        if (!stopped) setProblem(true);
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (el) el.srcObject = null;
    };
  }, [cam]);

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-950">
        <video ref={video} autoPlay playsInline muted className={cn("size-full -scale-x-100 object-cover", !cam && "hidden")} />
        {(!cam || problem) && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-semibold text-ink-300">
            {problem ? t("previewError") : t("cameraOff")}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
          <button
            type="button"
            onClick={onMic}
            aria-pressed={mic}
            aria-label={mic ? t("muteMic") : t("unmuteMic")}
            className={cn("grid size-12 place-items-center rounded-full", mic ? "bg-white text-ink-900" : "bg-live text-white")}
          >
            {mic ? <Mic className="size-5" aria-hidden /> : <MicOff className="size-5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onCam}
            aria-pressed={cam}
            aria-label={cam ? t("stopCamera") : t("startCamera")}
            className={cn("grid size-12 place-items-center rounded-full", cam ? "bg-white text-ink-900" : "bg-live text-white")}
          >
            {cam ? <Video className="size-5" aria-hidden /> : <VideoOff className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The live room of one live: the ready-to-join screen, then the room itself, then what is shown when it is
 * over. The host presses "Démarrer" (which opens the room for the members); members press "Rejoindre".
 * Joining on a tap matters: browsers only let sound start after one.
 */
export function LiveRoom({
  liveId,
  title,
  role,
  status,
  access,
  reserved,
  endHref,
}: {
  liveId: string;
  title: string;
  role: "host" | "viewer";
  /** where the live stands when the page was drawn */
  status: "scheduled" | "live";
  /** who the live is for: a free live warns every member, a reserved one only those who reserved */
  access: "free" | "premium" | "team";
  /** members who reserved a place */
  reserved: number;
  /** where "leave" ends up once the live is over */
  endHref: string;
}) {
  const t = useTranslations("liveRoom");
  const err = useErrorText();
  const router = useRouter();
  const isHost = role === "host";

  const [phase, setPhase] = useState<Phase>("idle");
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);
  // a free live warns everybody by default; a reserved one has nobody to warn unless some reserved
  const canNotify = access === "free" || (access === "premium" && reserved > 0);
  const [notify, setNotify] = useState(access === "free");
  const roomRef = useRef<Room | null>(null);

  // closing the page leaves the room
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const connect = async () => {
    setError(null);
    setPhase("connecting");
    let next: Room | null = null;
    try {
      if (isHost && status === "scheduled") {
        const started = await startLiveAction(liveId, canNotify && notify);
        if (!started.ok) throw new Error(started.errors?.form ?? "generic");
      }

      const response = await fetch(`/api/lives/${liveId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ as: isHost ? "host" : "viewer" }),
      });
      const data = (await response.json().catch(() => ({}))) as { token?: string; url?: string; error?: string };
      if (!response.ok || !data.token || !data.url) throw new Error(data.error ?? "generic");

      next = new Room({
        // pictures are sent at the size they are shown, and not at all when nobody looks
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720 },
        publishDefaults: { simulcast: true },
      });
      const joined = next;
      joined.on(RoomEvent.Disconnected, (reason) => {
        if (roomRef.current !== joined) return;
        roomRef.current = null;
        setRoom(null);
        setPhase(
          reason === DisconnectReason.ROOM_DELETED
            ? "ended"
            : reason === DisconnectReason.PARTICIPANT_REMOVED
              ? "kicked"
              : reason === DisconnectReason.CLIENT_INITIATED
                ? "left"
                : "lost",
        );
      });
      try {
        await joined.connect(data.url, data.token);
      } catch {
        throw new Error("room_unreachable");
      }
      roomRef.current = joined;
      setRoom(joined);

      if (isHost) {
        // camera and microphone as chosen on the preview; a refusal is shown, not fatal
        try {
          await joined.localParticipant.setMicrophoneEnabled(mic);
          await joined.localParticipant.setCameraEnabled(cam);
        } catch {
          setError("media_denied");
        }
      }
      setPhase("live");
      router.refresh();
    } catch (e) {
      next?.disconnect();
      roomRef.current = null;
      setRoom(null);
      setError(e instanceof Error ? e.message : "generic");
      setPhase("idle");
    }
  };

  const leave = () => roomRef.current?.disconnect();

  const end = async () => {
    if (!window.confirm(t("endConfirm"))) return;
    const result = await endLiveAction(liveId);
    if (!result.ok) {
      setError(result.errors?.form ?? "generic");
      return;
    }
    // everybody is disconnected by the server; this screen does not wait for it
    roomRef.current?.disconnect();
    setPhase("ended");
    router.refresh();
  };

  const errorText = error === "media_denied" ? t("camDenied") : err(error ?? undefined);

  if (phase === "live" && room) {
    return (
      <>
        {errorText && (
          <div className="mb-3">
            <Notice tone="error">{errorText}</Notice>
          </div>
        )}
        <RoomView
          room={room}
          liveId={liveId}
          title={title}
          isHost={isHost}
          audioOnly={audioOnly}
          onAudioOnly={setAudioOnly}
          onLeave={leave}
          onEnd={() => void end()}
        />
      </>
    );
  }

  if (phase === "ended" || phase === "kicked") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ivory-100 text-ink-600">
          <PhoneOff className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">{phase === "ended" ? t("endedTitle") : t("kickedTitle")}</h2>
        <p className="mt-2 leading-relaxed text-ink-500">{phase === "ended" ? t("endedText") : t("kickedText")}</p>
        <Button href={endHref} className="mt-6">
          {isHost ? t("backToLives") : t("seeReplays")}
        </Button>
      </div>
    );
  }

  if (phase === "left" || phase === "lost") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-display text-2xl font-semibold">{phase === "left" ? t("leftTitle") : t("lostTitle")}</h2>
        <p className="mt-2 leading-relaxed text-ink-500">{phase === "left" ? (isHost ? t("leftHostText") : t("leftText")) : t("lostText")}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={() => void connect()}>{phase === "left" ? t("rejoin") : t("reconnect")}</Button>
          {isHost && (
            <Button variant="danger" onClick={() => void end()}>
              {t("endForAll")}
            </Button>
          )}
        </div>
        {errorText && (
          <div className="mt-4 text-start">
            <Notice tone="error">{errorText}</Notice>
          </div>
        )}
      </div>
    );
  }

  /* idle and connecting: the ready-to-join screen */
  const busy = phase === "connecting";
  const resuming = isHost && status === "live";

  if (isHost) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <HostPreview cam={cam} mic={mic} onCam={() => setCam((c) => !c)} onMic={() => setMic((m) => !m)} />
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="font-display text-2xl font-semibold">{resuming ? t("hostResumeTitle") : t("hostTitle")}</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">{resuming ? t("hostResumeText") : t("hostText")}</p>
          {!resuming && canNotify && (
            <div className="mt-5" onChange={(e) => setNotify((e.target as HTMLInputElement).checked)}>
              <CheckRow
                name="notify"
                value="on"
                label={t("notifyMembers")}
                help={access === "free" ? t("notifyHelpAll") : t("notifyHelpReserved", { count: reserved })}
                defaultChecked={access === "free"}
              />
            </div>
          )}
          {errorText && (
            <div className="mt-4">
              <Notice tone="error">{errorText}</Notice>
            </div>
          )}
          <Button size="lg" variant="danger" className="mt-6 w-full" disabled={busy} onClick={() => void connect()}>
            <Radio className="size-5" aria-hidden /> {busy ? t("starting") : resuming ? t("joinRoom") : t("startLive")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-ink-900 p-8 text-center text-white shadow-lift sm:p-10">
      <LiveDot label={t("live")} />
      <h2 dir="auto" className="mt-5 font-display text-3xl font-semibold leading-tight">
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-ink-200">{t("viewerText")}</p>
      <Button size="lg" variant="danger" className="mt-8" disabled={busy} onClick={() => void connect()}>
        <Radio className="size-5" aria-hidden /> {busy ? t("joining") : t("join")}
      </Button>
      <label className="mx-auto mt-6 flex w-fit cursor-pointer items-start gap-3 text-start text-sm text-ink-200">
        <input
          type="checkbox"
          checked={audioOnly}
          onChange={(e) => setAudioOnly(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-jade-500"
        />
        <span>
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Headphones className="size-4" aria-hidden /> {t("audioOnly")}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-ink-300">{t("audioOnlyHelp")}</span>
        </span>
      </label>
      {errorText && (
        <div className="mt-6 text-start">
          <Notice tone="error">{errorText}</Notice>
        </div>
      )}
    </div>
  );
}
