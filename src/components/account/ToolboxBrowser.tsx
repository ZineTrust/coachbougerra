"use client";

import { useState } from "react";
import { Check, Copy, Lightbulb } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { markScriptUsedAction } from "@/actions/progress";
import { Field } from "@/components/ui/form";
import type { Locale } from "@/i18n/routing";
import { copyText } from "@/lib/clipboard";
import { POINTS } from "@/lib/gamification";
import {
  TOOLBOX_CATEGORIES,
  personalise,
  type Script,
  type ToolboxCategory,
} from "@/lib/toolbox";
import { cn } from "@/lib/utils";

/** The message text, with the parts still to fill in (in [brackets]) highlighted. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/g).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark key={i} className="rounded bg-gold-100 px-1 text-ink-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function ToolboxBrowser({
  scripts,
  usedIds,
}: {
  scripts: Script[];
  usedIds: string[];
}) {
  const t = useTranslations("toolbox");
  const locale = useLocale() as Locale;
  const [category, setCategory] = useState<ToolboxCategory | "all">("all");
  const [name, setName] = useState("");
  const [used, setUsed] = useState<string[]>(usedIds);
  const [copied, setCopied] = useState<string | null>(null);

  const shown = category === "all" ? scripts : scripts.filter((s) => s.category === category);

  const copy = async (script: Script) => {
    const text = personalise(script.text[locale], name, locale);
    // nothing was copied, so it doesn't count as used
    if (!(await copyText(text))) return;
    setCopied(script.id);
    setTimeout(() => setCopied((c) => (c === script.id ? null : c)), 2000);
    if (!used.includes(script.id)) {
      setUsed((u) => [...u, script.id]);
      void markScriptUsedAction(script.id);
    }
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
      active ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ivory-100",
    );

  return (
    <div>
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <Field
            label={t("nameLabel")}
            hint={t("nameHint")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={40}
            autoComplete="off"
          />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button type="button" className={chip(category === "all")} onClick={() => setCategory("all")}>
              {t("all")}
            </button>
            {TOOLBOX_CATEGORIES.map((c) => (
              <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
                {t(`categories.${c}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[13px] text-ink-500">{t("points", { points: POINTS.script })}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {shown.map((s) => {
          const isCopied = copied === s.id;
          const text = personalise(s.text[locale], name, locale);
          return (
            <article
              key={s.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-jade-600">
                    {t(`categories.${s.category}`)}
                  </p>
                  <h3 className="mt-1 text-lg font-bold leading-snug">{s.title[locale]}</h3>
                </div>
                {used.includes(s.id) && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-jade-50 px-2.5 py-1 text-[11px] font-bold text-jade-700">
                    <Check className="size-3" strokeWidth={3} aria-hidden /> {t("used")}
                  </span>
                )}
              </div>

              <p
                dir="auto"
                className="mt-4 whitespace-pre-line rounded-xl bg-ivory-50 p-4 text-[15px] leading-relaxed text-ink-800 ring-1 ring-ink-900/5"
              >
                <Highlighted text={text} />
              </p>

              <p className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-ink-500">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                <span>
                  <b className="text-ink-700">{t("tip")} : </b>
                  {s.tip[locale]}
                </span>
              </p>

              <button
                type="button"
                onClick={() => copy(s)}
                className={cn(
                  "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                  isCopied ? "bg-jade-50 text-jade-700" : "bg-jade-600 text-white hover:bg-jade-700",
                )}
              >
                {isCopied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {isCopied ? t("copied") : t("copy")}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
