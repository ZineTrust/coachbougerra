import { ArrowRight, Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { CoachPhoto } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

/** Landing-page teaser for Coach Bougerra's story, with two of his photos. */
export function StoryTeaser() {
  const t = useTranslations("home.story");
  const s = useTranslations("story");

  return (
    <section className="stage relative overflow-hidden">
      <div className="dots absolute inset-0 opacity-50" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-28">
        {/* photos */}
        <div className="relative pb-10 pe-6 lg:pe-10">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-stage ring-1 ring-white/10">
            <CoachPhoto
              photo="celebration"
              alt={s("altCelebration")}
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent" />
            <p className="absolute bottom-4 start-5 text-sm font-semibold text-white">
              {s("photoCelebration")}
            </p>
          </div>

          <div className="absolute bottom-0 end-0 w-[38%] overflow-hidden rounded-2xl shadow-stage ring-4 ring-ink-950">
            <div className="relative aspect-square">
              <CoachPhoto photo="portrait" alt={s("altPortrait")} sizes="20vw" />
            </div>
          </div>

          <span className="absolute -top-4 start-4 inline-flex items-center gap-2 rounded-full bg-gold-400 py-2 ps-3 pe-4 text-xs font-bold text-ink-950 shadow-lift">
            <Star className="size-4 fill-current" aria-hidden />
            {t("badge")}
          </span>
        </div>

        {/* text */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
            {t("title")}
          </h2>
          <div className="mt-7 flex gap-4">
            <Quote className="flip-rtl mt-1 size-8 shrink-0 text-jade-400" aria-hidden />
            <p className="text-lg leading-relaxed text-ink-100">{t("quote")}</p>
          </div>
          <div className="mt-9">
            <Button href="/histoire" size="lg" variant="gold">
              {t("cta")} <ArrowRight className="flip-rtl size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
