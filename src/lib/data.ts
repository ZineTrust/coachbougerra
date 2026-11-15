/*
  Brand constants, the video categories and the live types. The formations and the lives are
  real: they live in the database and the team publishes them from the workspace
  (see src/server/videos.ts and src/server/lives.ts). Every text exists in French and Arabic.

  (Members, staff, notifications, groups, formations and lives are NOT sample data.)
*/
import type { Locale } from "@/i18n/routing";

/** A text in both languages. */
export type L10n = Record<Locale, string>;

/* ------------------------------ Brand ------------------------------ */

export const BRAND = {
  name: "Coach Bougerra",
  /** Photos of Coach Bougerra (public/images). */
  photos: {
    office: "/images/bougerra-ultimate-office.webp", // 1242 × 2000
    portrait: "/images/bougerra-portrait.webp", // 960 × 960
    celebration: "/images/bougerra-celebration.webp", // 1915 × 1078
  },
} as const;

/* ------------------------------ Videos ----------------------------- */

export const VIDEO_CATEGORIES = [
  "network",
  "leadership",
  "prospecting",
  "mindset",
  "products",
] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export interface Video {
  slug: string;
  /** both languages are always present: a missing one is filled from the other */
  title: L10n;
  description: L10n;
  category: VideoCategory;
  /** seconds; 0 = not given */
  duration: number;
  /** PV (the monthly points a consultant earns on Ultimate) needed to unlock it; 0 = free */
  pv: number;
  /** how many different members opened it */
  views: number;
  /** colour of the cover when there is no cover image (made from the slug) */
  hue: number;
  status: "published" | "draft";
  /** days since it was first published (0 for a draft) */
  daysAgo: number;
  /** a video is linked (the link itself never leaves the server) */
  hasVideo: boolean;
  /** when the cover image last changed (ms), null = no cover image */
  coverVersion: number | null;
}

export const isFree = (v: Pick<Video, "pv">) => v.pv === 0;

/* ------------------------------ Lives ------------------------------ */

export type LiveAccess = "free" | "premium" | "team";
export type LiveStatus = "scheduled" | "live" | "ended" | "cancelled";

/** A live the team planned (table `lives`, see src/server/lives.ts). */
export interface Live {
  id: string;
  title: L10n;
  description: L10n;
  host: string;
  /** "premium" = reserved access: the team gives it to a member (nothing to pay) */
  access: LiveAccess;
  startsAt: Date;
  /** minutes */
  length: number;
  status: LiveStatus;
  /** slug of the formation that holds the recording, once published */
  replaySlug: string | null;
  /** what the team typed, one language possibly empty (`title` and `description` fill it with the other) */
  typed: { titleFr: string; titleAr: string; descriptionFr: string; descriptionAr: string };
}

/** Kept as a name for the lives shown as "coming up": the same record. */
export type UpcomingLive = Live;
