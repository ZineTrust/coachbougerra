import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const tones = {
  gold: "bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950 shadow-[0_14px_28px_-12px_rgb(207_154_53/0.8)]",
  jade: "bg-gradient-to-br from-jade-400 to-jade-600 text-white shadow-[0_14px_28px_-12px_rgb(12_132_103/0.8)]",
  ink: "bg-gradient-to-br from-ink-600 to-ink-800 text-white shadow-[0_14px_28px_-12px_rgb(13_26_45/0.8)]",
} as const;

/** The big rounded "New meeting / Join / Schedule" style buttons from Zoom's home. */
export function ActionTile({
  icon: Icon,
  label,
  tone = "jade",
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone?: keyof typeof tones;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "grid size-[5.25rem] place-items-center rounded-[1.4rem] transition-transform duration-200 group-hover:-translate-y-1 group-active:scale-95 sm:size-24",
          tones[tone],
        )}
      >
        <Icon className="size-9" aria-hidden />
      </span>
      <span className="text-center text-sm font-semibold leading-tight">{label}</span>
    </>
  );
  const cls = "group flex flex-col items-center gap-3 rounded-2xl p-1 text-ink-900";

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
