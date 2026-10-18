/*
  Brand constants, the video categories and the SAMPLE lives. The formations are real
  now: they live in the database and the team publishes them from the workspace
  (see src/server/videos.ts). Every text exists in French and Arabic.

  (Members, staff, notifications, groups and formations are NOT sample data.)
*/
import type { Locale } from "@/i18n/routing";
import { nextOccurrence, type WeeklySlot } from "./utils";

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

export interface Live {
  id: string;
  title: L10n;
  description: L10n;
  host: string;
  /** "premium" = reserved access: the team gives it to a member (nothing to pay) */
  access: LiveAccess;
  slot: WeeklySlot;
  /** minutes */
  length: number;
  registered: number;
}

export const LIVES: Live[] = [
  {
    id: "habitudes-du-leader",
    title: {
      fr: "Les 5 habitudes d'un leader qui construit son équipe",
      ar: "5 عادات يمارسها القائد الذي يبني فريقه",
    },
    description: {
      fr: "Un live interactif pour installer une routine de leader : organisation, régularité et état d'esprit. Questions en direct.",
      ar: "بثّ مباشر تفاعلي لبناء روتين القائد: التنظيم والانتظام وعقلية النجاح. مع أسئلة مباشرة.",
    },
    host: "Coach Bougerra",
    access: "free",
    slot: { weekday: 0, hour: 20, minute: 30 },
    length: 60,
    registered: 312,
  },
  {
    id: "masterclass-recruter",
    title: {
      fr: "Masterclass : recruter et fidéliser dans la durée",
      ar: "ماستر كلاس: الاستقطاب والاحتفاظ بالفريق على المدى الطويل",
    },
    description: {
      fr: "Une session approfondie sur la façon d'attirer les bonnes personnes et de les accompagner. Accès réservé : demandez-le à l'équipe.",
      ar: "جلسة معمّقة حول كيفية جذب الأشخاص المناسبين ومرافقتهم. الوصول مخصص: اطلبه من الفريق.",
    },
    host: "Coach Bougerra",
    access: "premium",
    slot: { weekday: 2, hour: 21, minute: 0 },
    length: 90,
    registered: 148,
  },
  {
    id: "questions-reponses",
    title: {
      fr: "Questions & réponses business en direct avec Bougerra",
      ar: "أسئلة وأجوبة عن المشروع مباشرة مع بوقرة",
    },
    description: {
      fr: "Posez vos questions sur la prospection, l'équipe et la régularité. Coach Bougerra répond en direct.",
      ar: "اطرح أسئلتك حول التواصل مع العملاء والفريق والاستمرارية. يجيب كوتش بوقرة مباشرة.",
    },
    host: "Coach Bougerra",
    access: "free",
    slot: { weekday: 4, hour: 20, minute: 0 },
    length: 75,
    registered: 267,
  },
  {
    id: "point-equipe",
    title: {
      fr: "Point d'équipe hebdomadaire",
      ar: "الاجتماع الأسبوعي للفريق",
    },
    description: {
      fr: "Réservé au staff. Objectifs de la semaine, retours de terrain et organisation.",
      ar: "خاص بالطاقم. أهداف الأسبوع وملاحظات الميدان والتنظيم.",
    },
    host: "Coach Bougerra",
    access: "team",
    slot: { weekday: 1, hour: 19, minute: 30 },
    length: 60,
    registered: 24,
  },
];

export const withNext = (live: Live, now = new Date()) => ({
  ...live,
  startsAt: nextOccurrence(live.slot, now),
});

export type UpcomingLive = ReturnType<typeof withNext>;

/** Lives ordered by when they start next. Team-only lives stay in the workspace. */
export function upcomingLives(now = new Date(), opts?: { includeTeam?: boolean }) {
  return LIVES.filter((l) => opts?.includeTeam || l.access !== "team")
    .map((l) => withNext(l, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
