import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { emDark } from "@/components/ui/rich";

export function CtaBanner() {
  const t = useTranslations("home.cta");
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
      <div className="stage relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="dots absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {t.rich("title", emDark)}
          </h2>
          <p className="mt-5 text-lg text-ink-200">{t("lead")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/connexion?mode=register" size="lg" variant="primary">
              {t("primary")} <ArrowRight className="flip-rtl size-5" aria-hidden />
            </Button>
            <Button href="/videos" size="lg" variant="ghost-light">
              {t("secondary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
