import { CalendarClock, Gift, Send, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { emLight } from "@/components/ui/rich";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS: { id: "start" | "earn" | "ask"; icon: LucideIcon }[] = [
  { id: "start", icon: Gift },
  { id: "earn", icon: TrendingUp },
  { id: "ask", icon: Send },
];

/** How formations are unlocked: with the PV a consultant earns each month, never with money. */
export function UnlockSteps() {
  const t = useTranslations("home.unlock");

  return (
    <section id="debloquer" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
      <SectionHeading
        align="center"
        eyebrow={t("eyebrow")}
        title={t.rich("title", emLight)}
        lead={t("lead")}
      />

      <ol className="mt-14 grid gap-6 lg:grid-cols-3">
        {STEPS.map(({ id, icon: Icon }, i) => (
          <li
            key={id}
            className="relative flex flex-col rounded-3xl bg-white p-7 shadow-card ring-1 ring-ink-900/5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-jade-50 text-jade-600">
                <Icon className="size-6" aria-hidden />
              </span>
              <span dir="ltr" className="font-display text-4xl font-semibold text-ink-200">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-bold">{t(`${id}.title`)}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{t(`${id}.text`)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex items-start gap-4 rounded-3xl bg-ink-900 p-6 text-white sm:items-center sm:p-8">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-400 text-ink-950">
          <CalendarClock className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-bold">{t("resetTitle")}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-200">{t("resetText")}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/connexion?mode=register" size="lg" variant="primary">
          {t("ctaJoin")}
        </Button>
        <Button href="/videos" size="lg" variant="outline">
          {t("ctaCourses")}
        </Button>
      </div>
    </section>
  );
}
