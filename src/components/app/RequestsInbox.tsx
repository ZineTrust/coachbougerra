"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Undo2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { decideRequestAction, revokeRequestAction } from "@/actions/unlocks";
import { initialState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice, TextArea, useErrorText } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { copyText } from "@/lib/clipboard";
import type { MemberTitle } from "@/lib/permissions";
import { UNLOCK_NOTE_MAX, type UnlockView } from "@/lib/unlock";
import { cn, formatDateTime } from "@/lib/utils";

/** One request, with everything needed to check it, as plain data from the server. */
export interface RequestItem {
  id: number;
  memberCode: number;
  name: string | null;
  city: string | null;
  title: MemberTitle;
  ultimateCode: string;
  videoTitle: string;
  pvRequired: number;
  pvClaimed: number;
  /** PV already checked for this member this month */
  verifiedPv: number;
  note: string | null;
  /** ISO */
  createdAt: string;
  status: UnlockView;
  decidedBy: string | null;
  /** ISO */
  decidedAt: string | null;
  decisionNote: string | null;
  /** an approval of this month that staff may still take back */
  canRevoke: boolean;
}

function MemberLine({ r }: { r: RequestItem }) {
  const tt = useTranslations("titles");
  const t = useTranslations("space.requests");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link
        href={`/espace/membres/${r.memberCode}`}
        dir="ltr"
        className="rounded-full bg-jade-50 px-3 py-1 font-bold tabular-nums text-jade-700 hover:bg-jade-100"
      >
        #{r.memberCode}
      </Link>
      <span dir="auto" className="font-bold">
        {r.name ?? t("noName")}
      </span>
      {r.city && (
        <span dir="auto" className="text-sm text-ink-500">
          {r.city}
        </span>
      )}
      <Badge tone="neutral">{tt(r.title)}</Badge>
    </div>
  );
}

function PendingCard({ r }: { r: RequestItem }) {
  const t = useTranslations("space.requests");
  const err = useErrorText();
  const locale = useLocale() as Locale;
  const [state, action, pending] = useActionState(decideRequestAction, initialState);
  const [refusing, setRefusing] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <li className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 sm:p-6">
      <MemberLine r={r} />

      <p dir="auto" className="mt-4 text-lg font-bold leading-snug">
        {r.videoTitle}
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-ivory-100 p-3.5">
          <dt className="text-xs font-semibold text-ink-500">{t("ultimateCode")}</dt>
          <dd className="mt-1 flex items-center justify-between gap-2">
            <span dir="ltr" className="select-all font-mono text-lg font-bold tracking-wide">
              {r.ultimateCode}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (await copyText(r.ultimateCode)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-white hover:text-ink-900"
              aria-label={t("copyCode")}
            >
              {copied ? <Check className="size-4 text-jade-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </button>
          </dd>
        </div>
        <div className="rounded-xl bg-gold-100 p-3.5">
          <dt className="text-xs font-semibold text-ink-600">{t("claimed")}</dt>
          <dd dir="ltr" className="mt-1 text-start font-display text-2xl font-semibold tabular-nums">
            {r.pvClaimed} <span className="text-sm font-sans text-ink-600">PV</span>
          </dd>
        </div>
        <div className="rounded-xl bg-ivory-100 p-3.5">
          <dt className="text-xs font-semibold text-ink-500">{t("required")}</dt>
          <dd dir="ltr" className="mt-1 text-start font-display text-2xl font-semibold tabular-nums">
            {r.pvRequired} <span className="text-sm font-sans text-ink-500">PV</span>
          </dd>
        </div>
      </dl>

      {r.verifiedPv > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-jade-50 px-3.5 py-2.5 text-sm font-semibold text-jade-800">
          <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />
          {t("alreadyChecked", { pv: r.verifiedPv })}
        </p>
      )}

      {r.note && (
        <p dir="auto" className="mt-3 whitespace-pre-line rounded-xl bg-ivory-50 px-4 py-3 text-[15px] leading-relaxed text-ink-700 ring-1 ring-ink-900/5">
          {r.note}
        </p>
      )}
      <p className="mt-3 text-xs text-ink-400">{t("askedAt", { date: formatDateTime(new Date(r.createdAt), locale) })}</p>

      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="id" value={r.id} />
        {refusing && (
          <TextArea
            label={t("reasonLabel")}
            name="note"
            rows={2}
            maxLength={UNLOCK_NOTE_MAX}
            placeholder={t("reasonPlaceholder")}
            error={err(state.errors?.note)}
          />
        )}
        {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
        <div className="flex flex-wrap gap-3">
          {!refusing ? (
            <>
              <Button type="submit" name="decision" value="approve" disabled={pending}>
                <Check className="size-[18px]" aria-hidden /> {t("approve")}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setRefusing(true)}>
                <X className="size-[18px]" aria-hidden /> {t("refuse")}
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" name="decision" value="reject" variant="danger" disabled={pending}>
                {t("confirmRefuse")}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setRefusing(false)}>
                {t("cancel")}
              </Button>
            </>
          )}
        </div>
        <p className="text-xs leading-snug text-ink-500">{t("notifyNote")}</p>
      </form>
    </li>
  );
}

function RevokeButton({ id }: { id: number }) {
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

const TONE: Record<UnlockView, "free" | "premium" | "alert" | "neutral"> = {
  approved: "free",
  pending: "premium",
  rejected: "alert",
  revoked: "neutral",
  expired: "neutral",
};

function DecidedRow({ r }: { r: RequestItem }) {
  const t = useTranslations("space.requests");
  const locale = useLocale() as Locale;
  const when = r.decidedAt ?? r.createdAt;
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <MemberLine r={r} />
        <p dir="auto" className="font-semibold leading-snug">
          {r.videoTitle}
        </p>
        <p className="text-sm text-ink-500">
          <span dir="ltr">
            {r.pvClaimed} / {r.pvRequired} PV
          </span>{" "}
          · {formatDateTime(new Date(when), locale)}
          {r.decidedBy && ` · ${t("by", { name: r.decidedBy })}`}
          {r.decisionNote && (
            <span dir="auto"> · {r.decisionNote}</span>
          )}
        </p>
      </div>
      <div className={cn("flex shrink-0 flex-wrap items-center gap-3 sm:justify-end")}>
        <Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge>
        {r.canRevoke && <RevokeButton id={r.id} />}
      </div>
    </li>
  );
}

export function RequestsInbox({
  pending,
  decided,
}: {
  pending: RequestItem[];
  decided: RequestItem[];
}) {
  const t = useTranslations("space.requests");
  const [tab, setTab] = useState<"pending" | "decided">("pending");

  const tabButton = (id: "pending" | "decided", label: string, count: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        tab === id ? "bg-jade-50 text-jade-700" : "text-ink-500 hover:text-ink-900",
      )}
    >
      {label} <span className="ms-1 text-xs opacity-70">{count}</span>
    </button>
  );

  return (
    <div>
      <div className="flex gap-1 rounded-2xl bg-white p-2 shadow-card ring-1 ring-ink-900/5">
        {tabButton("pending", t("tabPending"), pending.length)}
        {tabButton("decided", t("tabDecided"), decided.length)}
      </div>

      {tab === "pending" ? (
        pending.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white px-6 py-16 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
            {t("emptyPending")}
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {pending.map((r) => (
              <PendingCard key={r.id} r={r} />
            ))}
          </ul>
        )
      ) : decided.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-6 py-16 text-center text-ink-500 shadow-card ring-1 ring-ink-900/5">
          {t("emptyDecided")}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-ink-100 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5 sm:p-6">
          {decided.map((r) => (
            <DecidedRow key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
