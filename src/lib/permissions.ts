/*
  Shared vocabulary for accounts and access. No server code here, so both
  server and client components can import it.
*/

/** What a staff account may do. The owner (Coach Bougerra) can always do everything. */
export const STAFF_PERMISSIONS = [
  "members_view", // see the list of registered members
  "members_manage", // give / remove access, suspend, reset a member's password
  "messages_manage", // read and answer the messages members send
  "notifications_send", // send notifications to members
  "videos_manage", // publish and edit formations
  "lives_manage", // plan and run lives
  "groups_manage", // see every group and its chat, create groups by rank, moderate
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const isStaffPermission = (v: string): v is StaffPermission =>
  (STAFF_PERMISSIONS as readonly string[]).includes(v);

/** The rank a consultant holds inside Ultimate, chosen at registration. */
export const MEMBER_TITLES = [
  "consultant",
  "manager",
  "senior_manager",
  "director",
] as const;
export type MemberTitle = (typeof MEMBER_TITLES)[number];

export const isMemberTitle = (v: string): v is MemberTitle =>
  (MEMBER_TITLES as readonly string[]).includes(v);

/*
  Access grants: extra rights a staff member can give a single member.
    videos:all      → can watch every formation, premium included
    lives:all       → can join every live, premium included
    video:<slug>    → can watch this one formation
*/
export const GRANT_ALL_VIDEOS = "videos:all";
export const GRANT_ALL_LIVES = "lives:all";
export const videoGrant = (slug: string) => `video:${slug}`;

export const hasVideoAccess = (grants: readonly string[], slug: string) =>
  grants.includes(GRANT_ALL_VIDEOS) || grants.includes(videoGrant(slug));

/** The first member gets this number; each new one is +1. */
export const FIRST_MEMBER_CODE = 101;
