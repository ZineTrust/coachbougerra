"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { staffLoginAction } from "@/actions/auth";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, PasswordField, useErrorText } from "@/components/ui/form";

export function StaffLoginForm() {
  const t = useTranslations("space.login");
  const err = useErrorText();
  const [state, action, pending] = useActionState(staffLoginAction, initialState);

  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="space-y-4">
      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      <Field
        label={t("email")}
        name="email"
        type="email"
        ltr
        autoComplete="username"
        defaultValue={state.values?.email}
        required
      />
      <PasswordField label={t("password")} name="password" autoComplete="current-password" required />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
