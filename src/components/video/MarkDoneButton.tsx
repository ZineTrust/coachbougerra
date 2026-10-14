"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleVideoDoneAction } from "@/actions/progress";
import { POINTS } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/** "Marquer comme terminée": a member ticks off a formation and earns points for it. */
export function MarkDoneButton({ slug, done }: { slug: string; done: boolean }) {
  const t = useTranslations("video");
  const errors = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useOptimistic(done);

  const toggle = () => {
    setFailed(false);
    startTransition(async () => {
      setShown(!shown);
      const result = await toggleVideoDoneAction(slug, !shown);
      if (!result.ok) setFailed(true);
    });
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={shown}
        className={cn(
          "inline-flex h-11 items-center gap-2.5 rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-60",
          shown
            ? "bg-jade-50 text-jade-700 ring-1 ring-jade-200 hover:bg-jade-100"
            : "bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ivory-100",
        )}
      >
        {shown ? <Check className="size-[18px]" strokeWidth={3} aria-hidden /> : <Circle className="size-[18px]" aria-hidden />}
        {shown ? t("done") : t("markDone")}
        {!shown && (
          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-ink-800">
            {t("donePoints", { points: POINTS.video })}
          </span>
        )}
        {shown && <span className="text-xs font-medium text-jade-600">· {t("undo")}</span>}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm font-semibold text-live">
          {errors("generic")}
        </p>
      )}
    </div>
  );
}
