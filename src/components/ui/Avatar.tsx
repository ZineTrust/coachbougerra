import Image from "next/image";
import { BRAND } from "@/lib/data";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .replace(/\./g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function Avatar({
  name,
  hue = 165,
  className,
}: {
  name: string;
  hue?: number;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue + 30} 60% 28%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/**
 * A member's own photo when they added one, otherwise their initials.
 * `photoVersion` (when the photo last changed) makes a new photo appear at once.
 */
export function MemberAvatar({
  code,
  name,
  photoVersion,
  className,
}: {
  code: number;
  name: string;
  photoVersion: number | null;
  className?: string;
}) {
  if (photoVersion === null) {
    return <Avatar name={name} hue={(code * 47) % 360} className={className} />;
  }
  return (
    // a plain <img>: the photo is private and served with the visitor's cookies
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/avatar/${code}?v=${photoVersion}`}
      alt=""
      className={cn("inline-block size-10 shrink-0 rounded-full object-cover", className)}
    />
  );
}

/** Which of Coach Bougerra's photos to show, and where to crop it. */
export type PhotoKey = keyof typeof BRAND.photos;

const FOCUS: Record<PhotoKey, string> = {
  office: "62% 66%", // the man at the desk, lower right of a tall photo
  portrait: "78% 40%", // seated, right side of a square photo
  celebration: "30% 40%",
};

/** Fills its (relatively positioned) parent with one of Coach Bougerra's photos. */
export function CoachPhoto({
  photo = "office",
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 40vw, 90vw",
}: {
  photo?: PhotoKey;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={BRAND.photos[photo]}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
      style={{ objectPosition: FOCUS[photo] }}
    />
  );
}
