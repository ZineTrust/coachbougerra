"use client";

import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { revokeRequestAction } from "@/actions/unlocks";
import { initialState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/components/ui/form";
import type { UnlockView } from "@/lib/unlock";

export interface UnlockLine {
  id: number;
  videoTitle: string;
  status: UnlockView;
  pvClaimed: number;
  pvRequired: number;
  /** formatted last day of the month, for an approval */
  validUntil: string | null;
  note: string | null;
}

function Revoke({ id }: { id: number }) {
  const t = useTranslations("space.requests");
  const err = useErrorText();
  const [state, action, pending] = useActionState(revokeRequestAction, initialState);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Undo2 className="size-4" aria-hidden /> {t("revoke")}
      </Button>
      {state.errors?.form && <span className="text-xs font-semibold text-live">{err(state.errors.form)}</span>}
    </form>
  );
}

const TONE = {
  approved: "free",
  pending: "premium",
  rejected: "alert",
  revoked: "neutral",
  expired: "neutral",
} as const;

/** What this member asked to unlock this month, and what they can watch because of it. */
export function MemberUnlocks({ lines, canManage }: { lines: UnlockLine[]; canManage: boolean }) {
  const t = useTranslations("space.requests");

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-ink-500">{t("memberHelp")}</p>
      {lines.length === 0 ? (
        <p className="text-[15px] text-ink-600">{t("memberEmpty")}</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {lines.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p dir="auto" className="font-semibold leading-snug">
                  {l.videoTitle}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  <span dir="ltr">
                    {l.pvClaimed} / {l.pvRequired} PV
                  </span>
                  {l.validUntil && ` · ${t("validUntil", { date: l.validUntil })}`}
                  {l.note && <span dir="auto"> · {l.note}</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Badge tone={TONE[l.status]}>{t(`status.${l.status}`)}</Badge>
                {canManage && l.status === "approved" && <Revoke id={l.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
