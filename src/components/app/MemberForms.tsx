"use client";

import { useActionState, useEffect } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  addGrantsAction,
  resetMemberPasswordAction,
  setGrantsAction,
  setMemberStatusAction,
} from "@/actions/members";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { CheckRow, Notice, useErrorText } from "@/components/ui/form";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { GRANT_ALL_LIVES, GRANT_ALL_VIDEOS, videoGrant } from "@/lib/permissions";

/** Ticks: what this member may watch or join without paying. */
export function MemberAccessForm({
  code,
  grants,
  premiumVideos,
  readOnly,
}: {
  code: number;
  grants: string[];
  premiumVideos: Video[];
  readOnly: boolean;
}) {
  const t = useTranslations("space.members");
  const locale = useLocale() as Locale;
  const err = useErrorText();
  const [state, action, pending] = useActionState(setGrantsAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <p className="text-sm leading-relaxed text-ink-500">{t("accessHelp")}</p>

      {/* disabled fieldset: a read-only staff account sees the ticks but can't change them */}
      <fieldset disabled={readOnly || pending} className="space-y-3 disabled:opacity-70">
        <CheckRow
          name="grant"
          value={GRANT_ALL_VIDEOS}
          label={t("allVideos")}
          defaultChecked={grants.includes(GRANT_ALL_VIDEOS)}
        />
        <CheckRow
          name="grant"
          value={GRANT_ALL_LIVES}
          label={t("allLives")}
          defaultChecked={grants.includes(GRANT_ALL_LIVES)}
        />
        <p className="pt-2 text-sm font-semibold text-ink-700">{t("singleVideos")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {premiumVideos.map((v) => (
            <CheckRow
              key={v.slug}
              name="grant"
              value={videoGrant(v.slug)}
              label={v.title[locale]}
              defaultChecked={grants.includes(videoGrant(v.slug))}
            />
          ))}
        </div>
      </fieldset>

      {state.ok && <Notice tone="success">{t("accessSaved")}</Notice>}
      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      {readOnly ? (
        <Notice tone="info">{t("readOnly")}</Notice>
      ) : (
        <Button type="submit" disabled={pending}>
          {t("saveAccess")}
        </Button>
      )}
    </form>
  );
}

/**
 * Quick grant for several members at once (from the members list). The ticked
 * accesses are ADDED to each selected member; nothing is removed.
 */
export function BulkAccessForm({
  codes,
  premiumVideos,
  onSaved,
}: {
  codes: number[];
  premiumVideos: Video[];
  onSaved: () => void;
}) {
  const t = useTranslations("space.members");
  const locale = useLocale() as Locale;
  const err = useErrorText();
  const [state, action, pending] = useActionState(addGrantsAction, initialState);

  // once saved, let the list clear its selection
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form key={state.ok ? "saved" : "editing"} action={action} className="space-y-3">
      {codes.map((c) => (
        <input key={c} type="hidden" name="code" value={c} />
      ))}
      <p className="text-sm leading-relaxed text-ink-500">{t("bulkHelp")}</p>

      <fieldset disabled={pending} className="space-y-3">
        <CheckRow name="grant" value={GRANT_ALL_VIDEOS} label={t("allVideos")} />
        <CheckRow name="grant" value={GRANT_ALL_LIVES} label={t("allLives")} />
        <p className="pt-2 text-sm font-semibold text-ink-700">{t("singleVideos")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {premiumVideos.map((v) => (
            <CheckRow key={v.slug} name="grant" value={videoGrant(v.slug)} label={v.title[locale]} />
          ))}
        </div>
      </fieldset>

      {state.ok && (
        <Notice tone="success">{t("bulkDone", { count: Number(state.info?.count ?? 0) })}</Notice>
      )}
      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      <Button type="submit" disabled={pending}>
        {t("bulkSave")}
      </Button>
    </form>
  );
}

/** Suspend / reactivate and password reset. */
export function MemberActions({
  code,
  status,
}: {
  code: number;
  status: "active" | "suspended";
}) {
  const t = useTranslations("space.members");
  const err = useErrorText();
  const [statusState, statusAction, statusPending] = useActionState(setMemberStatusAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetMemberPasswordAction, initialState);
  const suspended = status === "suspended";

  return (
    <div className="space-y-5">
      <p className={suspended ? "font-semibold text-live" : "font-semibold text-jade-700"}>
        {suspended ? t("statusSuspended") : t("statusActive")}
      </p>

      <div className="flex flex-wrap gap-3">
        <form action={statusAction}>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
          <Button type="submit" variant={suspended ? "soft" : "danger"} size="sm" disabled={statusPending}>
            {suspended ? <UserCheck className="size-4" aria-hidden /> : <UserX className="size-4" aria-hidden />}
            {suspended ? t("reactivate") : t("suspend")}
          </Button>
        </form>

        <form action={resetAction}>
          <input type="hidden" name="code" value={code} />
          <Button type="submit" variant="outline" size="sm" disabled={resetPending}>
            <KeyRound className="size-4" aria-hidden /> {t("resetPassword")}
          </Button>
        </form>
      </div>

      {(statusState.errors?.form || resetState.errors?.form) && (
        <Notice tone="error">{err(statusState.errors?.form ?? resetState.errors?.form)}</Notice>
      )}

      {resetState.ok && resetState.info?.password && (
        <div className="rounded-xl bg-gold-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">{t("resetDone")}</p>
          <p dir="ltr" className="mt-1.5 select-all text-start font-mono text-xl font-bold tracking-wider text-ink-900">
            {resetState.info.password}
          </p>
          <p className="mt-2 text-[13px] leading-snug text-ink-700">{t("resetNote")}</p>
        </div>
      )}
    </div>
  );
}
