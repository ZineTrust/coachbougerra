import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="stage grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <div className="flex justify-center">
          <Logo tone="dark" />
        </div>
        <p dir="ltr" className="mt-12 font-display text-8xl font-semibold text-jade-300">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-300">{t("text")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/" variant="primary" size="lg">
            {t("home")}
          </Button>
        </div>
      </div>
    </div>
  );
}
