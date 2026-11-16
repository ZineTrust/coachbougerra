import "server-only";
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";

/*
  The video room. The site never touches the video itself: a LiveKit server (LiveKit Cloud's free plan, or
  one installed on a small VPS, see README "Salle de live") carries it. The site only decides who may enter
  and with what rights, by signing a short token for each person.

  Three settings turn it on (the same three whichever LiveKit it is):
    LIVEKIT_URL         wss://your-project.livekit.cloud   (or wss://live.yourdomain.com)
    LIVEKIT_API_KEY
    LIVEKIT_API_SECRET
*/

const url = () => process.env.LIVEKIT_URL?.trim() ?? "";
const apiKey = () => process.env.LIVEKIT_API_KEY?.trim() ?? "";
const apiSecret = () => process.env.LIVEKIT_API_SECRET?.trim() ?? "";

/** Is the video room set up? Without it the pages say so instead of failing. */
export const livekitReady = () => Boolean(url() && apiKey() && apiSecret());

/** The most people one room lets in (0 = no limit of our own; LiveKit's own plan limit still applies). */
const maxPeople = () => {
  const n = Number(process.env.LIVEKIT_MAX_PARTICIPANTS);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

export const roomName = (liveId: string) => `live-${liveId}`;

/** Every identity is "member:<code>" or "staff:<id>", so one person cannot be in the room twice with two faces. */
export const memberIdentity = (code: number) => `member:${code}`;
export const staffIdentity = (id: number) => `staff:${id}`;

/** What people can do: the host publishes everything, the audience watches, a guest on stage speaks. */
export type RoomRole = "host" | "guest" | "audience";

const SPEAKING: TrackSource[] = [TrackSource.MICROPHONE, TrackSource.CAMERA];
const HOSTING: TrackSource[] = [...SPEAKING, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];

function permission(role: RoomRole) {
  return {
    canSubscribe: true,
    canPublish: role !== "audience",
    canPublishData: true,
    // raising a hand is an attribute people set on themselves
    canUpdateMetadata: true,
    canPublishSources: role === "host" ? HOSTING : role === "guest" ? SPEAKING : [],
  };
}

export interface RoomTicket {
  token: string;
  url: string;
}

/** A token to enter the room of one live. It is valid for a few hours, enough for any live. */
export async function roomTicket(input: {
  liveId: string;
  identity: string;
  name: string;
  role: RoomRole;
}): Promise<RoomTicket> {
  const at = new AccessToken(apiKey(), apiSecret(), {
    identity: input.identity,
    name: input.name,
    ttl: "6h",
  });
  at.addGrant({
    room: roomName(input.liveId),
    roomJoin: true,
    roomAdmin: false,
    canSubscribe: true,
    canPublish: input.role !== "audience",
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: [],
    ...(input.role === "host" ? { canPublishSources: HOSTING } : input.role === "guest" ? { canPublishSources: SPEAKING } : {}),
  });
  return { token: await at.toJwt(), url: url() };
}

let client: RoomServiceClient | null = null;
const rooms = () => (client ??= new RoomServiceClient(url(), apiKey(), apiSecret()));

/** Makes sure the room exists with the right limits before the first person walks in. Safe to repeat. */
export async function openRoom(liveId: string): Promise<void> {
  try {
    await rooms().createRoom({
      name: roomName(liveId),
      // an empty room closes by itself after 10 minutes; a person who drops can come back
      emptyTimeout: 600,
      departureTimeout: 120,
      ...(maxPeople() ? { maxParticipants: maxPeople() } : {}),
    });
  } catch {
    // the room is also created by the first person who joins: not being able to pre-create it is not fatal
  }
}

/** Closes the room: everybody is disconnected. */
export async function closeRoom(liveId: string): Promise<void> {
  if (!livekitReady()) return;
  try {
    await rooms().deleteRoom(roomName(liveId));
  } catch {
    // already closed, or never opened
  }
}

/** Puts a person on stage (they can speak and show their camera) or sends them back to the audience. */
export async function setOnStage(liveId: string, identity: string, onStage: boolean): Promise<boolean> {
  try {
    await rooms().updateParticipant(roomName(liveId), identity, { permission: permission(onStage ? "guest" : "audience") });
    return true;
  } catch {
    return false;
  }
}

export async function removeFromRoom(liveId: string, identity: string): Promise<boolean> {
  try {
    await rooms().removeParticipant(roomName(liveId), identity);
    return true;
  } catch {
    return false;
  }
}

/* ---- people sent out of a live stay out of it (kept in memory: enough for one site process) ---- */

const globalForKicked = globalThis as unknown as { __coachBouguerraKicked?: Map<string, Set<string>> };
const kicked = (globalForKicked.__coachBouguerraKicked ??= new Map<string, Set<string>>());

export function banFromLive(liveId: string, identity: string) {
  const set = kicked.get(liveId) ?? new Set<string>();
  set.add(identity);
  kicked.set(liveId, set);
  // keep the table small: only the most recent lives matter
  if (kicked.size > 50) kicked.delete(kicked.keys().next().value as string);
}

export const isBannedFromLive = (liveId: string, identity: string) => kicked.get(liveId)?.has(identity) ?? false;
