import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "gold"
  | "dark"
  | "outline"
  | "soft"
  | "danger"
  | "ghost-light";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-jade-600 text-white shadow-[0_8px_20px_-8px_rgb(12_132_103/0.7)] hover:bg-jade-700",
  gold: "bg-gold-400 text-ink-950 shadow-[0_8px_20px_-8px_rgb(224_180_85/0.7)] hover:bg-gold-300",
  dark: "bg-ink-900 text-white hover:bg-ink-700",
  outline:
    "border border-ink-200 bg-white text-ink-900 hover:border-ink-300 hover:bg-ivory-100",
  soft: "bg-jade-50 text-jade-700 hover:bg-jade-100",
  danger: "bg-live text-white hover:bg-live/90",
  "ghost-light":
    "border border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/12",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-sm",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-[52px] gap-2.5 px-7 text-base",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};
type AsLink = Common & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "href" | "className" | "children"
  >;
type AsButton = Common & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  >;

export function Button(props: AsLink | AsButton) {
  const { variant, size, className, children, ...rest } = props;
  const styles = buttonStyles(variant, size, className);

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link className={styles} {...(rest as Omit<AsLink, keyof Common>)}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={styles}
      {...(rest as Omit<AsButton, keyof Common>)}
    >
      {children}
    </button>
  );
}
