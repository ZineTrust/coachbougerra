"use client";

import { useActionState, useState } from "react";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { loginAction, registerAction } from "@/actions/auth";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, PasswordField, useErrorText } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import { MEMBER_TITLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="w-full max-w-md">
      <div
        className="grid grid-cols-2 rounded-full bg-ivory-200/70 p-1"
        role="tablist"
        aria-label={t("tablist")}
      >
        {(
          [
            ["login", t("tabLogin")],
            ["register", t("tabRegister")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "h-11 rounded-full text-sm font-semibold transition-all",
              mode === id ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "login" ? <LoginForm /> : <RegisterForm />}

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="font-semibold text-ink-600 hover:text-ink-900">
          {t("backToSite")}
        </Link>
      </p>
    </div>
  );
}

function LoginForm() {
  const t = useTranslations("auth.login");
  const err = useErrorText();
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div>
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-ink-500">{t("subtitle")}</p>

      {/* the key remounts the form with what was typed, so an error doesn't wipe it */}
      <form key={JSON.stringify(state.values ?? {})} action={action} className="mt-8 space-y-4">
        {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}

        <Field
          label={t("identifier")}
          name="identifier"
          ltr
          autoComplete="username"
          placeholder={t("identifierPlaceholder")}
          defaultValue={state.values?.identifier}
          required
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="current-password"
          required
          aside={
            <button
              type="button"
              onClick={() => setShowHelp((s) => !s)}
              className="text-xs font-semibold text-jade-700 hover:text-jade-600"
            >
              {t("forgot")}
            </button>
          }
        />
        {showHelp && <Notice tone="info">{t("forgotHelp")}</Notice>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-500">
        <Info className="mt-0.5 size-4 shrink-0 text-jade-600" aria-hidden />
        {t("codeHint")}
      </p>
    </div>
  );
}

function RegisterForm() {
  const t = useTranslations("auth.register");
  const titles = useTranslations("titles");
  const err = useErrorText();
  const [state, action, pending] = useActionState(registerAction, initialState);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <div>
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-ink-500">{t("subtitle")}</p>

      <form key={JSON.stringify(values)} action={action} className="mt-8 space-y-5">
        {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}

        <fieldset>
          <legend className="text-sm font-semibold text-ink-700">{t("rank")}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MEMBER_TITLES.map((rank) => (
              <label
                key={rank}
                dir="ltr"
                className="cursor-pointer rounded-xl px-4 py-3 text-center text-sm font-semibold ring-1 ring-ink-200 transition-colors hover:bg-ivory-100 has-[:checked]:bg-jade-600 has-[:checked]:text-white has-[:checked]:ring-jade-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jade-500"
              >
                <input
                  type="radio"
                  name="title"
                  value={rank}
                  defaultChecked={values.title === rank}
                  required
                  className="sr-only"
                />
                {titles(rank)}
              </label>
            ))}
          </div>
          {errors.title && (
            <p role="alert" className="mt-1.5 text-[13px] font-medium text-live">
              {err(errors.title)}
            </p>
          )}
        </fieldset>

        <Field
          label={t("email")}
          name="email"
          type="email"
          ltr
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          defaultValue={values.email}
          error={err(errors.email)}
          required
        />
        <Field
          label={t("phone")}
          name="phone"
          type="tel"
          ltr
          autoComplete="tel"
          inputMode="tel"
          placeholder={t("phonePlaceholder")}
          defaultValue={values.phone}
          error={err(errors.phone)}
          required
        />
        <Field
          label={t("ultimateCode")}
          name="ultimateCode"
          ltr
          autoComplete="off"
          placeholder={t("ultimateCodePlaceholder")}
          hint={t("ultimateCodeHint")}
          defaultValue={values.ultimateCode}
          error={err(errors.ultimateCode)}
          required
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="new-password"
          hint={t("passwordHint")}
          error={err(errors.password)}
          minLength={8}
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-jade-50 p-4 text-[13px] leading-relaxed text-jade-900">
        <Info className="mt-0.5 size-4 shrink-0 text-jade-600" aria-hidden />
        {t("codeInfo")}
      </p>
    </div>
  );
}
