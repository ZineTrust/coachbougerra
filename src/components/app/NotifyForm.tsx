"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendNotificationAction } from "@/actions/notifications";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, Segmented, TextArea, useErrorText } from "@/components/ui/form";

/** Compose a notification for everyone, or only for specific member codes. */
export function NotifyForm({ prefillCode }: { prefillCode?: string }) {
  const t = useTranslations("space.notifications");
  const err = useErrorText();
  const [state, action, pending] = useActionState(sendNotificationAction, initialState);
  const [audience, setAudience] = useState<"all" | "codes">(prefillCode ? "codes" : "all");

  const errors = state.errors ?? {};
  const values = state.values ?? {};
  const listInfo = {
    list: String(state.info?.invalid ?? state.info?.missing ?? ""),
  };

  return (
    // after a successful send the form is rebuilt empty; after an error it keeps what was typed
    <form
      key={state.ok ? `sent-${JSON.stringify(state.info)}` : JSON.stringify(values)}
      action={action}
      className="space-y-4"
    >
      {state.ok && (
        <Notice tone="success">
          {state.info?.recipients === "all"
            ? t("sentAll")
            : t("sentSome", { count: Number(state.info?.recipients ?? 0) })}
        </Notice>
      )}
      {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}

      <Field
        label={t("titleLabel")}
        name="title"
        placeholder={t("titlePlaceholder")}
        defaultValue={values.title}
        error={err(errors.title)}
        maxLength={120}
        required
      />
      <TextArea
        label={t("bodyLabel")}
        name="body"
        placeholder={t("bodyPlaceholder")}
        defaultValue={values.body}
        error={err(errors.body)}
        maxLength={2000}
        rows={5}
        required
      />

      <Segmented
        label={t("audience")}
        name="audience"
        value={audience}
        onChange={setAudience}
        options={[
          { value: "all", label: t("everyone") },
          { value: "codes", label: t("specific") },
        ]}
      />

      {audience === "codes" && (
        <Field
          label={t("codesLabel")}
          name="codes"
          ltr
          placeholder={t("codesPlaceholder")}
          hint={t("codesHelp")}
          defaultValue={values.codes ?? prefillCode}
          error={err(errors.codes, listInfo)}
          required
        />
      )}

      <Button type="submit" size="lg" disabled={pending}>
        <Send className="flip-rtl size-[18px]" aria-hidden /> {t("send")}
      </Button>
    </form>
  );
}
