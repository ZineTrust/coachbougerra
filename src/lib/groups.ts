/* Limits and shared bits of the groups feature (no server code: also used by the browser). */

export const GROUP_NAME_MAX = 60;
export const GROUP_DESCRIPTION_MAX = 200;
export const GROUP_MESSAGE_MAX = 1000;

/** A member can start this many groups of friends. */
export const MAX_FRIEND_GROUPS_PER_MEMBER = 5;
/** Members + pending invitations in a group of friends. */
export const MAX_FRIEND_GROUP_SIZE = 50;
export const MAX_INVITES_AT_ONCE = 20;

/** A voice note: at most 3 minutes, at most 1.5 MB (32 kbit/s mono MP3 is about 0.7 MB for 3 minutes). */
export const VOICE_MAX_SECONDS = 180;
export const VOICE_MAX_BYTES = 1_500_000;

/** How often an open chat asks for new messages. */
export const GROUP_POLL_MS = 5000;

export type GroupKind = "friends" | "official";
