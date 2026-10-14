"use client";

import { useActionState, useState } from "react";
import { KeyRound, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { createStaffAction, resetStaffPasswordAction, updateStaffAction } from "@/actions/staff";
import { initialState } from "@/actions/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckRow, Field, Notice, useErrorText } from "@/components/ui/form";
import { STAFF_PERMISSIONS, type StaffPermission } from "@/lib/permissions";
import { Modal } from "./Modal";

function PermissionChecks({ selected }: { selected: readonly StaffPermission[] }) {
  const t = useTranslations("space");
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2 text-sm font-semibold text-ink-700">{t("team.permissions")}</legend>
      {STAFF_PERMISSIONS.map((p) => (
        <CheckRow
          key={p}
          name="permission"
          value={p}
          label={t(`permissions.${p}`)}
          help={t(`permissionHelp.${p}`)}
          defaultChecked={selected.includes(p)}
        />
      ))}
    </fieldset>
  );
}

/** Shown once, right after creating an account or resetting a password. */
function Credentials({ email, password }: { email: string; password: string }) {
  const t = useTranslations("space.team");
  return (
    <div className="rounded-2xl bg-gold-100 p-5">
      <p className="text-sm font-bold text-ink-900">{t("credentialsTitle")}</p>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-semibold text-ink-600">{t("email")}</dt>
          <dd dir="ltr" className="select-all text-start font-mono text-base font-bold">{email}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-ink-600">{t("password")}</dt>
          <dd dir="ltr" className="select-all text-start font-mono text-xl font-bold tracking-wider">{password}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] leading-snug text-ink-700">{t("credentialsNote")}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function AddStaffButton() {
  const t = useTranslations("space.team");
  const c = useTranslations("common");
  const err = useErrorText();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createStaffAction, initialState);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-[18px]" aria-hidden /> {t("add")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addTitle")}
        description={state.ok ? undefined : t("addDescription")}
      >
        {state.ok && state.info ? (
          <div className="space-y-5">
            <Credentials email={String(state.info.email)} password={String(state.info.password)} />
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>{c("close")}</Button>
            </div>
          </div>
        ) : (
          <form key={JSON.stringify(values)} action={action} className="space-y-4">
            {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
            <Field label={t("name")} name="name" defaultValue={values.name} error={err(errors.name)} required />
            <Field
              label={t("email")}
              name="email"
              type="email"
              ltr
              autoComplete="off"
              defaultValue={values.email}
              error={err(errors.email)}
              required
            />
            <Field
              label={t("password")}
              name="password"
              ltr
              autoComplete="off"
              hint={t("passwordHint")}
              error={err(errors.password)}
            />
            <PermissionChecks selected={[]} />
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={pending}>
                {t("create")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */

export interface StaffCardData {
  id: number;
  name: string;
  email: string;
  isOwner: boolean;
  permissions: StaffPermission[];
  active: boolean;
  lastLogin: string | null;
}

export function StaffCard({ staff }: { staff: StaffCardData }) {
  const t = useTranslations("space");
  const c = useTranslations("common");
  const err = useErrorText();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateStaffAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetStaffPasswordAction, initialState);
  const errors = state.errors ?? {};

  return (
    <li className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <div className="flex items-start gap-4">
        <Avatar name={staff.name} hue={(staff.id * 61) % 360} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold">{staff.name}</p>
            {staff.isOwner && (
              <Badge tone="premium">
                <ShieldCheck className="size-3" aria-hidden /> {t("team.ownerBadge")}
              </Badge>
            )}
            {!staff.active && <Badge tone="alert">{t("team.inactive")}</Badge>}
          </div>
          <p dir="ltr" className="mt-0.5 truncate text-start text-sm text-ink-500">{staff.email}</p>
        </div>
        {!staff.isOwner && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> {t("team.edit")}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {staff.isOwner ? (
          <p className="text-[13px] text-ink-500">{t("team.ownerNote")}</p>
        ) : staff.permissions.length === 0 ? (
          <Badge tone="neutral">{t("team.noPermissions")}</Badge>
        ) : (
          staff.permissions.map((p) => (
            <Badge key={p} tone="free">
              {t(`permissions.${p}`)}
            </Badge>
          ))
        )}
      </div>

      <p className="mt-4 text-xs text-ink-400">
        {t("team.lastLogin", { date: staff.lastLogin ?? t("team.never") })}
      </p>

      {!staff.isOwner && (
        <Modal open={open} onClose={() => setOpen(false)} title={t("team.editTitle")}>
          <div className="space-y-6">
            <form action={action} className="space-y-4">
              <input type="hidden" name="id" value={staff.id} />
              {state.ok && <Notice tone="success">{t("members.accessSaved")}</Notice>}
              {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
              <Field label={t("team.name")} name="name" defaultValue={staff.name} error={err(errors.name)} required />
              <PermissionChecks selected={staff.permissions} />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-ink-200 has-[:checked]:bg-jade-50 has-[:checked]:ring-jade-400">
                <input type="checkbox" name="active" defaultChecked={staff.active} className="mt-1 size-4 accent-jade-600" />
                <span>
                  <span className="block text-sm font-semibold">{t("team.active")}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-500">{t("team.activeHelp")}</span>
                </span>
              </label>
              <Button type="submit" disabled={pending}>
                {c("save")}
              </Button>
            </form>

            <form action={resetAction} className="border-t border-ink-100 pt-5">
              <input type="hidden" name="id" value={staff.id} />
              <Button type="submit" variant="outline" size="sm" disabled={resetPending}>
                <KeyRound className="size-4" aria-hidden /> {t("team.resetPassword")}
              </Button>
              {resetState.ok && resetState.info && (
                <div className="mt-4">
                  <Credentials email={String(resetState.info.email)} password={String(resetState.info.password)} />
                </div>
              )}
              {resetState.errors?.form && (
                <div className="mt-4">
                  <Notice tone="error">{err(resetState.errors.form)}</Notice>
                </div>
              )}
            </form>
          </div>
        </Modal>
      )}
    </li>
  );
}
