/*
  SAMPLE CONTENT — the formations and lives below are placeholders so the
  interface looks real while the platform is built. Every text exists in French
  and Arabic. When publishing moves to the workspace, these arrays are replaced
  by database queries with the same shape.

  (Members, staff and notifications are NOT sample data: they are real and
  live in the database, see src/server.)
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
  title: L10n;
  description: L10n;
  category: VideoCategory;
  /** seconds */
  duration: number;
  /**
   * PV (the monthly points a consultant earns on Ultimate) needed to unlock it.
   * 0 = free. This is the DEFAULT: staff can change it per formation, and the
   * value in use comes from the database (see server/videos.ts).
   */
  pv: number;
  views: number;
  /** thumbnail gradient hue, purely decorative until real thumbnails exist */
  hue: number;
  status: "published" | "draft";
  daysAgo: number;
}

export const isFree = (v: Pick<Video, "pv">) => v.pv === 0;

export const VIDEOS: Video[] = [
  {
    slug: "bienvenue-par-ou-commencer",
    title: {
      fr: "Bienvenue : par où commencer votre parcours de leader ?",
      ar: "مرحبًا بك: من أين تبدأ رحلتك كقائد؟",
    },
    description: {
      fr: "La vidéo à voir en premier. Coach Bougerra présente sa méthode, les trois piliers d'un business solide et comment tirer le meilleur des lives et des formations.",
      ar: "الفيديو الأول الذي يجب أن تشاهده. يعرض كوتش بوقرة منهجه، والركائز الثلاث لمشروع قوي، وكيف تستفيد إلى أقصى حد من البثوث المباشرة والدورات.",
    },
    category: "mindset",
    duration: 522,
    pv: 0,
    views: 4210,
    hue: 165,
    status: "published",
    daysAgo: 14,
  },
  {
    slug: "sept-erreurs-du-debutant",
    title: {
      fr: "Les 7 erreurs du débutant en marketing de réseau",
      ar: "الأخطاء السبعة التي يقع فيها المبتدئ في التسويق الشبكي",
    },
    description: {
      fr: "Ce qui freine la plupart des nouveaux consultants, et comment l'éviter dès vos premiers jours.",
      ar: "ما الذي يعرقل معظم المستشارين الجدد، وكيف تتجنبه منذ أيامك الأولى.",
    },
    category: "network",
    duration: 860,
    pv: 0,
    views: 3875,
    hue: 30,
    status: "published",
    daysAgo: 21,
  },
  {
    slug: "demarrer-une-conversation",
    title: {
      fr: "Prospection : démarrer une conversation sans pression",
      ar: "التواصل مع العملاء المحتملين: كيف تبدأ الحديث دون ضغط",
    },
    description: {
      fr: "Les phrases simples et les bons réflexes pour aborder de nouvelles personnes avec naturel et respect.",
      ar: "جمل بسيطة وعادات صحيحة للتحدث مع أشخاص جدد بشكل طبيعي ومحترم.",
    },
    category: "prospecting",
    duration: 665,
    pv: 0,
    views: 3102,
    hue: 335,
    status: "published",
    daysAgo: 30,
  },
  {
    slug: "programme-30-premiers-jours",
    title: {
      fr: "Programme : vos 30 premiers jours dans le business",
      ar: "برنامج: أول 30 يومًا في مشروعك",
    },
    description: {
      fr: "Un plan jour après jour pour démarrer solidement : objectifs, routine, premiers contacts et suivi.",
      ar: "خطة يومًا بيوم للانطلاق بقوة: الأهداف، والروتين، وأولى الاتصالات، والمتابعة.",
    },
    category: "network",
    duration: 2535,
    pv: 100,
    views: 1240,
    hue: 155,
    status: "published",
    daysAgo: 5,
  },
  {
    slug: "masterclass-batir-une-equipe",
    title: {
      fr: "Masterclass : bâtir et animer une équipe qui dure",
      ar: "ماستر كلاس: كيف تبني فريقًا وتقوده ليدوم",
    },
    description: {
      fr: "Recruter, former, motiver et fidéliser : les fondations d'une équipe solide, expliquées étape par étape.",
      ar: "الاستقطاب والتدريب والتحفيز والاحتفاظ بالفريق: أسس فريق قوي مشروحة خطوة بخطوة.",
    },
    category: "leadership",
    duration: 3510,
    pv: 300,
    views: 980,
    hue: 200,
    status: "published",
    daysAgo: 14,
  },
  {
    slug: "presenter-lopportunite",
    title: {
      fr: "Présenter l'opportunité sans forcer",
      ar: "كيف تعرض الفرصة دون إلحاح",
    },
    description: {
      fr: "Structurer une présentation claire et honnête, qui donne envie sans jamais mettre la pression.",
      ar: "بناء عرض واضح وصادق يشجّع دون أي ضغط.",
    },
    category: "prospecting",
    duration: 2208,
    pv: 200,
    views: 1105,
    hue: 185,
    status: "published",
    daysAgo: 21,
  },
  {
    slug: "rester-constant",
    title: {
      fr: "Rester constant quand la motivation baisse",
      ar: "كيف تستمر حين تضعف الحماسة",
    },
    description: {
      fr: "La motivation part, la discipline reste. Les systèmes simples pour tenir vos objectifs jour après jour.",
      ar: "الحماسة تزول والانضباط يبقى. أنظمة بسيطة لتحافظ على أهدافك يومًا بعد يوم.",
    },
    category: "mindset",
    duration: 767,
    pv: 0,
    views: 2988,
    hue: 45,
    status: "published",
    daysAgo: 60,
  },
  {
    slug: "reseaux-sociaux-bons-contacts",
    title: {
      fr: "Réseaux sociaux : attirer les bons contacts",
      ar: "وسائل التواصل الاجتماعي: كيف تجذب الأشخاص المناسبين",
    },
    description: {
      fr: "Un profil qui inspire confiance, du contenu utile et une méthode pour transformer l'attention en conversations.",
      ar: "حساب يبعث على الثقة، ومحتوى مفيد، وطريقة لتحويل الاهتمام إلى محادثات.",
    },
    category: "network",
    duration: 1750,
    pv: 100,
    views: 860,
    hue: 20,
    status: "published",
    daysAgo: 42,
  },
  {
    slug: "gerer-les-objections",
    title: {
      fr: "Gérer les objections : 10 réponses qui rassurent",
      ar: "التعامل مع الاعتراضات: 10 ردود تبعث على الطمأنينة",
    },
    description: {
      fr: "« C'est trop cher », « je n'ai pas le temps » : comment répondre avec calme et sincérité.",
      ar: "«إنه غالٍ» و«ليس لدي وقت»: كيف تجيب بهدوء وصدق.",
    },
    category: "prospecting",
    duration: 1990,
    pv: 200,
    views: 742,
    hue: 275,
    status: "published",
    daysAgo: 9,
  },
  {
    slug: "connaitre-les-produits",
    title: {
      fr: "Bien connaître les produits pour mieux conseiller",
      ar: "معرفة المنتجات جيدًا لتقدّم نصيحة أفضل",
    },
    description: {
      fr: "Les grandes familles de produits Ultimate Health & Beauty et comment les présenter avec justesse.",
      ar: "فئات منتجات Ultimate Health & Beauty الرئيسية وكيف تعرضها بدقة.",
    },
    category: "products",
    duration: 1620,
    pv: 0,
    views: 1930,
    hue: 140,
    status: "published",
    daysAgo: 35,
  },
  {
    slug: "de-consultant-a-manager",
    title: {
      fr: "De Consultant à Manager : le plan pour franchir le cap",
      ar: "من مستشار إلى مدير: خطة العبور إلى المستوى التالي",
    },
    description: {
      fr: "Les compétences, les habitudes et les résultats qui permettent de passer au niveau supérieur.",
      ar: "المهارات والعادات والنتائج التي تنقلك إلى المستوى التالي.",
    },
    category: "leadership",
    duration: 3120,
    pv: 400,
    views: 0,
    hue: 210,
    status: "draft",
    daysAgo: 0,
  },
];

/** Drafts only exist in the workspace, never on the public site. */
export const PUBLIC_VIDEOS = VIDEOS.filter((v) => v.status === "published");

export const getPublicVideo = (slug: string) =>
  PUBLIC_VIDEOS.find((v) => v.slug === slug);

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
