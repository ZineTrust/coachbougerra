import { BellRing, Network, Radio, Smartphone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { emLight } from "@/components/ui/rich";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ITEMS: { key: "lives" | "courses" | "community" | "mobile"; icon: LucideIcon }[] = [
  { key: "lives", icon: Radio },
  { key: "courses", icon: Network },
  { key: "community", icon: BellRing },
  { key: "mobile", icon: Smartphone },
];

export function Features() {
  const t = useTranslations("home.features");

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t.rich("title", emLight)}
        lead={t("lead")}
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
            <span className="grid size-12 place-items-center rounded-xl bg-jade-50 text-jade-600">
              <Icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold text-ink-900">{t(`${key}.title`)}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{t(`${key}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
