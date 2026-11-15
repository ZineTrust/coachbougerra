"use client";

import { useEffect, useRef } from "react";
import { MicOff, MonitorUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Track, type Participant, type RemoteParticipant } from "livekit-client";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

/** Members written "#123" have no profile name: the avatar gets the number's colour instead of letters. */
const hueOf = (identity: string) => {
  let h = 0;
  for (const ch of identity) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

/**
 * One person on stage: their camera (or their screen), a name label and a muted-microphone mark. The video
 * is plugged into the element straight from LiveKit, so React never re-renders on each frame.
 */
export function VideoTile({
  participant,
  source = Track.Source.Camera,
  local = false,
  hideVideo = false,
  className,
}: {
  participant: Participant;
  source?: Track.Source;
  local?: boolean;
  /** "audio only" mode: the picture is not received, so the avatar shows */
  hideVideo?: boolean;
  className?: string;
}) {
  const t = useTranslations("liveRoom");
  const pub = participant.getTrackPublication(source);
  const track = pub?.track;
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  const screen = source === Track.Source.ScreenShare;
  const showVideo = Boolean(track) && !pub?.isMuted && !hideVideo;
  const name = participant.name || participant.identity;
  const isTeam = participant.identity.startsWith("staff:");

  return (
    <div
      className={cn(
        "relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-ink-900 ring-2 ring-transparent transition-shadow",
        participant.isSpeaking && !screen && "ring-jade-400",
        className,
      )}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local}
        className={cn(
          "absolute inset-0 size-full",
          screen ? "object-contain" : "object-cover",
          local && !screen && "-scale-x-100",
          !showVideo && "hidden",
        )}
      />
      {!showVideo && (
        <Avatar name={name} hue={hueOf(participant.identity)} className="size-16 text-xl sm:size-20 sm:text-2xl" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-white">
        {screen ? (
          <MonitorUp className="size-3.5 shrink-0" aria-hidden />
        ) : (
          !participant.isMicrophoneEnabled && <MicOff className="size-3.5 shrink-0 text-live" aria-label={t("micIsOff")} />
        )}
        <span dir="auto" className="min-w-0 truncate text-xs font-semibold">
          {local ? t("you") : name}
          {isTeam && !local && <span className="ms-1.5 rounded bg-gold-400 px-1 py-px text-[0.625rem] font-bold uppercase text-ink-950">{t("team")}</span>}
        </span>
      </div>
    </div>
  );
}

/** Plays one remote person's sound. Nothing is drawn. */
function AudioPlayer({ track }: { track: NonNullable<ReturnType<Participant["getTrackPublication"]>>["track"] }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

/** The sound of everyone on stage (and of a shared screen). Must stay mounted for as long as the room is open. */
export function RemoteAudio({ participants }: { participants: RemoteParticipant[] }) {
  const tracks = participants.flatMap((p) =>
    [Track.Source.Microphone, Track.Source.ScreenShareAudio].flatMap((source) => {
      const track = p.getTrackPublication(source)?.track;
      return track ? [{ key: `${p.identity}:${source}`, track }] : [];
    }),
  );
  return (
    <>
      {tracks.map(({ key, track }) => (
        <AudioPlayer key={key} track={track} />
      ))}
    </>
  );
}
