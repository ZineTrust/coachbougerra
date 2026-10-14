"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { requestUnlockAction } from "@/actions/unlocks";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, TextArea, useErrorText } from "@/components/ui/form";
import { UNLOCK_NOTE_MAX } from "@/lib/unlock";

/** "I made X PV this month on Ultimate": the member's request to unlock one formation. */
export function RequestUnlockForm({ slug, required }: { slug: string; required: number }) {
  const t = useTranslations("unlock");
  const locale = useLocale();
  const err = useErrorText();
  const [state, action, pending] = useActionState(requestUnlockAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />

      <Field
        label={t("pvLabel")}
        hint={t("pvHint", { required })}
        name="pv"
        type="number"
        inputMode="numeric"
        min={required}
        step={1}
        ltr
        required
        defaultValue={state.values?.pv}
        placeholder={String(required)}
        error={err(state.errors?.pv, state.info)}
      />
      <TextArea
        label={`${t("noteLabel")} (${t("optional")})`}
        name="note"
        rows={3}
        maxLength={UNLOCK_NOTE_MAX}
        defaultValue={state.values?.note}
        placeholder={t("notePlaceholder")}
        error={err(state.errors?.note)}
      />

      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      {state.ok && <Notice tone="success">{t("sent")}</Notice>}

      <Button type="submit" size="lg" variant="gold" disabled={pending} className="w-full">
        <Send className="flip-rtl size-[18px]" aria-hidden /> {t("submit")}
      </Button>
      <p className="text-[13px] leading-snug text-ink-500">{t("verifyNote")}</p>
    </form>
  );
}
