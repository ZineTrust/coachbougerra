"use client";

import { useActionState } from "react";
import type { FormState } from "@/actions/types";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Notice, PasswordField, useErrorText } from "@/components/ui/form";

/** "Change my password", shared by members and staff (each passes its own action). */
export function PasswordChangeForm({
  action,
  labels,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  labels: { current: string; next: string; submit: string; done: string };
}) {
  const err = useErrorText();
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  return (
    // a fresh form after each success clears the typed passwords
    <form key={state.ok ? "done" : "editing"} action={formAction} className="space-y-4">
      {state.ok && <Notice tone="success">{labels.done}</Notice>}
      {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
      <PasswordField
        label={labels.current}
        name="current"
        autoComplete="current-password"
        error={err(errors.current)}
        required
      />
      <PasswordField
        label={labels.next}
        name="next"
        autoComplete="new-password"
        error={err(errors.next)}
        minLength={8}
        required
      />
      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
