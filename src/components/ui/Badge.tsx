import type { ReactNode } from "react";
import { Check, Lock, Radio, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LiveAccess } from "@/lib/data";
import { cn } from "@/lib/utils";

type Tone = "free" | "premium" | "live" | "team" | "neutral" | "dark" | "alert";

const tones: Record<Tone, string> = {
  free: "bg-jade-50 text-jade-700 ring-jade-100",
  premium: "bg-gold-100 text-ink-900 ring-gold-300/60",
  live: "bg-live text-white ring-transparent",
  team: "bg-ink-100 text-ink-700 ring-ink-200",
  neutral: "bg-ivory-100 text-ink-600 ring-ivory-200",
  dark: "bg-ink-950/70 text-white ring-white/15 backdrop-blur",
  alert: "bg-live/10 text-live ring-live/20",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Gratuit / "200 PV" marker for formations. `pv` is how much PV it takes to unlock
 * (0 = free); `unlocked` says this viewer already has access.
 */
export function AccessBadge({
  pv,
  onDark,
  unlocked,
}: {
  pv: number;
  onDark?: boolean;
  unlocked?: boolean;
}) {
  const t = useTranslations("common");
  if (pv === 0) {
    return <Badge tone={onDark ? "dark" : "free"}>{t("free")}</Badge>;
  }
  if (unlocked) {
    return (
      <Badge tone="free">
        <Check className="size-3" strokeWidth={3} aria-hidden /> {t("unlocked")}
      </Badge>
    );
  }
  return (
    <Badge tone="premium">
      <Lock className="size-3" aria-hidden /> <span dir="ltr">{t("pv", { pv })}</span>
    </Badge>
  );
}

export function LiveAccessBadge({ access }: { access: LiveAccess }) {
  const t = useTranslations("common");
  if (access === "free") return <Badge tone="free">{t("free")}</Badge>;
  if (access === "premium")
    return (
      <Badge tone="premium">
        <Lock className="size-3" aria-hidden /> {t("reserved")}
      </Badge>
    );
  return (
    <Badge tone="team">
      <Users className="size-3" aria-hidden /> {t("team")}
    </Badge>
  );
}

export function LiveDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
      <Radio className="size-3" aria-hidden />
      {label}
    </span>
  );
}
