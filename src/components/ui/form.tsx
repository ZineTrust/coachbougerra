"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const control =
  "mt-1.5 w-full rounded-xl bg-white px-4 text-[0.9375rem] ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-jade-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-live";

/** Turns an error code from the server ("email_taken") into text in the current language. */
export function useErrorText() {
  const t = useTranslations("errors");
  return (code?: string, values?: Record<string, string | number>) => {
    if (!code) return undefined;
    return t.has(code as never) ? t(code as never, values as never) : t("generic");
  };
}

function FieldShell({
  label,
  hint,
  error,
  aside,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="flex items-center justify-between gap-3 text-sm font-semibold text-ink-700">
          {label}
          {aside}
        </span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] font-medium text-live">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[0.8125rem] text-ink-500">{hint}</p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  aside?: React.ReactNode;
  /** e-mail, phone and codes are always written left-to-right, even in Arabic */
  ltr?: boolean;
};

export function Field({ label, hint, error, aside, ltr, className, ...props }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} aside={aside}>
      <input
        {...props}
        dir={ltr ? "ltr" : props.dir}
        aria-invalid={error ? true : undefined}
        className={cn(control, "h-12", ltr && "text-start", className)}
      />
    </FieldShell>
  );
}

export function PasswordField({
  label,
  hint,
  error,
  aside,
  ...props
}: Omit<InputProps, "type" | "ltr">) {
  const t = useTranslations("common");
  const [show, setShow] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} aside={aside}>
      <div className="relative">
        <input
          {...props}
          dir="ltr"
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className={cn(control, "h-12 pe-12 text-start")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute end-1 top-1.5 grid size-12 place-items-center text-ink-400 hover:text-ink-700"
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <textarea
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(control, "min-h-28 resize-y py-3")}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      <select {...props} className={cn(control, "h-12")}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Pill-style single choice, e.g. Gratuit / Premium. Also posts its value under `name`. */
export function Segmented<T extends string>({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-700">{label}</legend>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        className="mt-1.5 grid gap-1 rounded-xl bg-ivory-100 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition-all",
              value === o.value
                ? "bg-white text-ink-900 shadow-sm ring-1 ring-ink-900/5"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** A checkbox row with a title and a line of help text. */
export function CheckRow({
  name,
  value,
  label,
  help,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  help?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-ink-200 transition-colors has-[:checked]:bg-jade-50 has-[:checked]:ring-jade-400">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-jade-600"
      />
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {help && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-500">{help}</span>}
      </span>
    </label>
  );
}

/** Banner for a form-level error or a success message. */
export function Notice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle2 : TriangleAlert;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed",
        tone === "error" && "bg-live/10 text-live",
        tone === "success" && "bg-jade-50 text-jade-700",
        tone === "info" && "bg-gold-100 text-ink-800",
      )}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
