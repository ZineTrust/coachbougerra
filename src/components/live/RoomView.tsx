"use client";

import { useEffect, useRef, useState } from "react";
import {
  Hand,
  Headphones,
  Maximize,
  MessageSquare,
  Mic,
  MicOff,
  Minimize,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Square,
  Users,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConnectionState, RoomEvent, Track, type Participant, type RemoteParticipant, type Room } from "livekit-client";
import { LiveDot } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { CHAT_MAX, ChatPanel, type ChatMessage } from "./ChatPanel";
import { PeoplePanel } from "./PeoplePanel";
import { RemoteAudio, VideoTile } from "./Tiles";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_MESSAGES = 200;
const MIN_GAP_MS = 800;

/** Bumps a counter whenever anything in the room changes, so the screen is redrawn from the room's own state. */
function useRoomTick(room: Room) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // several changes in a blink (people joining, tracks arriving) are drawn once
    const bump = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        setTick((n) => n + 1);
      }, 80);
    };
    const events = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.ParticipantAttributesChanged,
      RoomEvent.ParticipantPermissionsChanged,
      RoomEvent.ParticipantNameChanged,
      RoomEvent.ConnectionStateChanged,
      RoomEvent.AudioPlaybackStatusChanged,
    ];
    for (const e of events) room.on(e as never, bump as never);
    return () => {
      for (const e of events) room.off(e as never, bump as never);
      if (timer) clearTimeout(timer);
    };
  }, [room]);
  return tick;
}

/** A phone left unlocked stays awake while the live goes on. */
function useScreenOn(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const ask = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (stopped) void lock.release();
      } catch {
        // refused (low battery, unsupported): nothing to do
      }
    };
    const again = () => {
      if (document.visibilityState === "visible") void ask();
    };
    void ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", again);
      void lock?.release();
    };
  }, [active]);
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  tone = "plain",
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  /** pressed / switched on */
  active?: boolean;
  tone?: "plain" | "danger" | "gold";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:px-4",
        tone === "danger" && "bg-live text-white hover:bg-live/90",
        tone === "gold" && "bg-gold-400 text-ink-950 hover:bg-gold-300",
        tone === "plain" && (active ? "bg-white text-ink-900" : "bg-white/10 text-white hover:bg-white/20"),
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ---- full screen helpers (Safari still uses the "webkit" names) ---- */

type FullscreenBox = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

const fullscreenElement = () => {
  const doc = document as FullscreenDoc;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

async function exitNativeFullscreen() {
  const doc = document as FullscreenDoc;
  try {
    await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
  } catch {
    // already out
  }
}

type LockableOrientation = ScreenOrientation & { lock?: (to: string) => Promise<void>; unlock?: () => void };

/** A phone in full screen is turned to landscape, the shape of the picture (only where the browser allows it). */
async function lockLandscape() {
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
  } catch {
    // not allowed here (desktop, iPhone): the viewer turns the phone by hand
  }
}

function unlockOrientation() {
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    // nothing to unlock
  }
}

/** The room once connected: stage, controls and the side panel (chat, and for the host the list of people). */
export function RoomView({
  room,
  liveId,
  title,
  isHost,
  audioOnly,
  onAudioOnly,
  onLeave,
  onEnd,
}: {
  room: Room;
  liveId: string;
  title: string;
  isHost: boolean;
  audioOnly: boolean;
  onAudioOnly: (on: boolean) => void;
  onLeave: () => void;
  onEnd: () => void;
}) {
  const t = useTranslations("liveRoom");
  const tick = useRoomTick(room);
  useScreenOn(true);

  const lp = room.localParticipant;
  const remotes: RemoteParticipant[] = Array.from(room.remoteParticipants.values());
  const everyone: Participant[] = [lp, ...remotes];
  const canPublish = Boolean(lp.permissions?.canPublish);
  const stage = everyone.filter((p) => p.permissions?.canPublish);
  const presenter = stage.find((p) => p.getTrackPublication(Track.Source.ScreenShare)?.track);
  const handsUp = remotes.filter((p) => p.attributes?.hand === "1").length;
  const reconnecting = room.state === ConnectionState.Reconnecting;
  const canShareScreen = isHost && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  const [tab, setTab] = useState<"chat" | "people">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hand, setHand] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(!room.canPlaybackAudio);
  const [nativeFullscreen, setNativeFullscreen] = useState(false); // the browser's own full screen
  const [coverPage, setCoverPage] = useState(false); // fallback: the stage covers the page (iPhone has no full screen for a page element)
  const fullscreen = nativeFullscreen || coverPage;
  const stageBox = useRef<HTMLDivElement>(null);
  const lastSent = useRef(0);
  const wasOnStage = useRef(canPublish);

  /* ---- chat ---- */
  useEffect(() => {
    const onData = (payload: Uint8Array, from?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== "chat" || !from) return;
      try {
        const data = JSON.parse(decoder.decode(payload)) as { t?: unknown };
        if (typeof data.t !== "string") return;
        const text = data.t.trim().slice(0, CHAT_MAX);
        if (!text) return;
        setMessages((list) =>
          [
            ...list,
            {
              id: `${from.identity}:${Date.now()}:${list.length}`,
              name: from.name || from.identity,
              text,
              mine: false,
              team: from.identity.startsWith("staff:"),
            },
          ].slice(-MAX_MESSAGES),
        );
      } catch {
        // not a chat message of ours: ignored
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  const send = async (text: string) => {
    const now = Date.now();
    if (now - lastSent.current < MIN_GAP_MS) return;
    lastSent.current = now;
    try {
      await lp.publishData(encoder.encode(JSON.stringify({ t: text })), { reliable: true, topic: "chat" });
      setMessages((list) =>
        [...list, { id: `me:${now}`, name: lp.name || lp.identity, text, mine: true, team: isHost }].slice(-MAX_MESSAGES),
      );
    } catch {
      setProblem(t("chatFailed"));
    }
  };

  /* ---- sound that the browser refused to start ---- */
  useEffect(() => {
    const check = () => setSoundBlocked(!room.canPlaybackAudio);
    room.on(RoomEvent.AudioPlaybackStatusChanged, check);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, check);
    };
  }, [room]);

  /* ---- audio only: the pictures of others are not received ---- */
  useEffect(() => {
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.kind === Track.Kind.Video && pub.isDesired === audioOnly) pub.setSubscribed(!audioOnly);
      }
    }
  }, [room, audioOnly, tick]);

  /* ---- invited on stage: the raised hand comes down by itself ---- */
  useEffect(() => {
    if (canPublish && !wasOnStage.current && !isHost) {
      void lp.setAttributes({ hand: "" });
      setHand(false);
    }
    wasOnStage.current = canPublish;
  }, [canPublish, isHost, lp]);

  /* ---- full screen of the stage ---- */
  useEffect(() => {
    const change = () => {
      const on = fullscreenElement() === stageBox.current;
      setNativeFullscreen(on);
      if (!on) unlockOrientation();
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("webkitfullscreenchange", change);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("webkitfullscreenchange", change);
    };
  }, []);

  // the fallback has no browser button to leave it: Escape does, and the page behind stops scrolling
  useEffect(() => {
    if (!coverPage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCoverPage(false);
    };
    document.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = before;
    };
  }, [coverPage]);

  // leaving the room (or the live ending) while in full screen must not leave the screen locked
  useEffect(
    () => () => {
      if (fullscreenElement()) void exitNativeFullscreen();
      unlockOrientation();
    },
    [],
  );

  const media = async (task: () => Promise<unknown>, denied: string) => {
    setProblem(null);
    try {
      await task();
    } catch {
      setProblem(denied);
    }
  };

  const toggleHand = () => {
    const next = !hand;
    setHand(next);
    void lp.setAttributes({ hand: next ? "1" : "" });
  };

  const toggleFullscreen = async () => {
    const el = stageBox.current;
    if (!el) return;
    if (fullscreen) {
      setCoverPage(false);
      if (fullscreenElement()) await exitNativeFullscreen();
      return;
    }
    // the browser's own full screen where there is one (a phone is then turned to landscape when it allows it)...
    const box = el as FullscreenBox;
    const request = box.requestFullscreen ?? box.webkitRequestFullscreen;
    if (request) {
      try {
        await request.call(box);
        void lockLandscape();
        return;
      } catch {
        // refused: the fallback below
      }
    }
    // ...else the stage fills the whole screen of the page
    setCoverPage(true);
  };

  /* ---- the stage ---- */
  const cols = stage.length <= 1 ? 1 : stage.length <= 4 ? 2 : 3;
  const stageTiles = (
    <div
      className="grid size-full gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}
    >
      {stage.map((p) => (
        <VideoTile key={p.identity} participant={p} local={p === lp} hideVideo={audioOnly && p !== lp} />
      ))}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <RemoteAudio participants={remotes} />

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 items-center gap-3">
            <LiveDot label={t("live")} />
            <h2 dir="auto" className="min-w-0 truncate text-lg font-bold text-ink-900">
              {title}
            </h2>
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500">
            <Users className="size-4" aria-hidden /> {t("inRoom", { count: remotes.length + 1 })}
          </p>
        </div>

        <div
          ref={stageBox}
          onDoubleClick={() => void toggleFullscreen()}
          // (one set of classes or the other, never both: two utilities for the same property fight)
          className={
            fullscreen
              ? "fixed inset-0 z-[100] m-0 flex items-center justify-center overflow-hidden bg-black"
              : "relative overflow-hidden rounded-2xl bg-ink-950 p-2"
          }
        >
          {fullscreen && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={t("exitFullscreen")}
              title={t("exitFullscreen")}
              className="absolute end-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
            >
              <Minimize className="size-5" aria-hidden />
            </button>
          )}
          {fullscreen && (
            <p className="pointer-events-none absolute inset-x-0 bottom-10 z-10 px-6 text-center text-sm font-semibold text-white/70 landscape:hidden">
              {t("rotateHint")}
            </p>
          )}
          {/* full screen: the picture is as big as it can be without being cut (16:9 inside the screen) */}
          <div className={fullscreen ? "aspect-video w-[min(100%,calc(100dvh*16/9))]" : "aspect-video w-full"}>
            {stage.length === 0 ? (
              <div className="grid size-full place-items-center rounded-xl bg-ink-900 px-6 text-center text-sm font-semibold text-ink-300">
                {t("waitingHost")}
              </div>
            ) : presenter ? (
              <div className="flex size-full flex-col gap-2">
                <VideoTile participant={presenter} source={Track.Source.ScreenShare} className="min-h-0 flex-1" />
                <div className="flex h-16 shrink-0 gap-2 overflow-x-auto sm:h-20">
                  {stage.map((p) => (
                    <VideoTile
                      key={p.identity}
                      participant={p}
                      local={p === lp}
                      hideVideo={audioOnly && p !== lp}
                      className="aspect-video h-full shrink-0"
                    />
                  ))}
                </div>
              </div>
            ) : (
              stageTiles
            )}
          </div>
        </div>

        {reconnecting && (
          <p role="status" className="rounded-xl bg-gold-100 px-4 py-2.5 text-sm font-semibold text-ink-800">
            {t("reconnecting")}
          </p>
        )}
        {soundBlocked && (
          <button
            type="button"
            onClick={() => void room.startAudio()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 py-3 text-sm font-bold text-ink-950 hover:bg-gold-300"
          >
            <Volume2 className="size-5" aria-hidden /> {t("enableSound")}
          </button>
        )}
        {canPublish && !isHost && (
          <p role="status" className="rounded-xl bg-jade-50 px-4 py-2.5 text-sm font-semibold text-jade-800">
            {t("youAreOnStage")}
          </p>
        )}
        {problem && (
          <p role="alert" className="rounded-xl bg-live/10 px-4 py-2.5 text-sm font-semibold text-live">
            {problem}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-ink-950 p-3">
          {canPublish && (
            <>
              <ControlButton
                icon={lp.isMicrophoneEnabled ? Mic : MicOff}
                label={lp.isMicrophoneEnabled ? t("muteMic") : t("unmuteMic")}
                active={lp.isMicrophoneEnabled}
                onClick={() => void media(() => lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled), t("micDenied"))}
              />
              <ControlButton
                icon={lp.isCameraEnabled ? Video : VideoOff}
                label={lp.isCameraEnabled ? t("stopCamera") : t("startCamera")}
                active={lp.isCameraEnabled}
                onClick={() => void media(() => lp.setCameraEnabled(!lp.isCameraEnabled), t("camDenied"))}
              />
            </>
          )}
          {canShareScreen && (
            <ControlButton
              icon={lp.isScreenShareEnabled ? MonitorOff : MonitorUp}
              label={lp.isScreenShareEnabled ? t("stopShare") : t("shareScreen")}
              active={lp.isScreenShareEnabled}
              onClick={() =>
                void media(() => lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true }), t("shareFailed"))
              }
            />
          )}
          {!canPublish && <ControlButton icon={Hand} label={hand ? t("lowerHand") : t("raiseHand")} active={hand} tone={hand ? "gold" : "plain"} onClick={toggleHand} />}
          {!isHost && (
            <ControlButton
              icon={Headphones}
              label={t("audioOnly")}
              active={audioOnly}
              onClick={() => onAudioOnly(!audioOnly)}
            />
          )}
          <ControlButton
            icon={fullscreen ? Minimize : Maximize}
            label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
            active={fullscreen}
            onClick={() => void toggleFullscreen()}
          />
          <ControlButton icon={PhoneOff} label={t("leave")} onClick={onLeave} />
          {isHost && <ControlButton icon={Square} label={t("endForAll")} tone="danger" onClick={onEnd} />}
        </div>
        {!isHost && audioOnly && <p className="text-center text-xs text-ink-500">{t("audioOnlyOn")}</p>}
      </div>

      <aside className="relative">
        <div className="flex h-[26rem] flex-col overflow-hidden rounded-2xl bg-ink-950 lg:absolute lg:inset-0 lg:h-auto">
          {isHost ? (
            <div role="tablist" className="grid shrink-0 grid-cols-2 border-b border-white/10 p-1.5">
              {(["chat", "people"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold",
                    tab === id ? "bg-white/10 text-white" : "text-ink-400 hover:text-white",
                  )}
                >
                  {id === "chat" ? <MessageSquare className="size-4" aria-hidden /> : <Users className="size-4" aria-hidden />}
                  {id === "chat" ? t("chat") : t("people")}
                  {id === "people" && handsUp > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-xs font-bold text-ink-950">
                      {handsUp}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-bold text-white">
              <MessageSquare className="size-4" aria-hidden /> {t("chat")}
            </p>
          )}
          {isHost && tab === "people" ? (
            <PeoplePanel liveId={liveId} people={remotes} />
          ) : (
            <ChatPanel messages={messages} onSend={(text) => void send(text)} disabled={reconnecting} />
          )}
        </div>
      </aside>
    </div>
  );
}
