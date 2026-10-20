"use client";

import { useActionState, useState } from "react";
import { CalendarClock, CheckCircle2, Pencil, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { saveGoalAction, saveProgressAction } from "@/actions/goals";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Field, Notice, useErrorText } from "@/components/ui/form";
import { GOAL_SUGGESTIONS, goalPercent } from "@/lib/goal";
import { cn, formatNumber } from "@/lib/utils";

export interface GoalCardProps {
  /** "octobre 2026" */
  monthLabel: string;
  goal: { targetPv: number; currentPv: number } | null;
  /** how the month before went */
  previous: { targetPv: number; currentPv: number; monthLabel: string } | null;
  daysLeft: number;
  /** the closest formation this member could ask to unlock with more PV */
  nextUnlock: { title: string; pv: number; missing: number } | null;
}

/**
 * The member's own PV goal for the month: set a target, write down the PV made so far, and see a bar
 * fill. It is personal tracking (the unlock of a formation still goes through a request the team
 * checks on Ultimate). A new month starts with no goal.
 */
export function GoalCard({ monthLabel, goal, previous, daysLeft, nextUnlock }: GoalCardProps) {
  const t = useTranslations("goal");
  const err = useErrorText();
  const [goalState, goalAction, goalPending] = useActionState(saveGoalAction, initialState);
  const [progressState, progressAction, progressPending] = useActionState(saveProgressAction, initialState);
  const [editing, setEditing] = useState(false);
  const [suggested, setSuggested] = useState("");

  const percent = goal ? goalPercent(goal.currentPv, goal.targetPv) : 0;
  const reached = goal !== null && goal.currentPv >= goal.targetPv;
  const remaining = goal ? Math.max(0, goal.targetPv - goal.currentPv) : 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-jade-50 text-jade-600">
              <Target className="size-[18px]" aria-hidden />
            </span>
            {t("title")}
          </h2>
          <p className="mt-1.5 text-sm font-semibold capitalize text-ink-500">{monthLabel}</p>
        </div>
        {goal && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-jade-700 hover:bg-jade-50"
          >
            <Pencil className="size-3.5" aria-hidden /> {t("editGoal")}
          </button>
        )}
      </div>

      {!goal || editing ? (
        <form
          action={(fd) => {
            goalAction(fd);
            setEditing(false);
          }}
          className="mt-5"
        >
          <p className="text-[0.9375rem] leading-relaxed text-ink-600">{goal ? t("editLead") : t("lead")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GOAL_SUGGESTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSuggested(String(n))}
                className="h-9 rounded-full px-4 text-sm font-semibold tabular-nums text-ink-700 ring-1 ring-ink-200 hover:bg-ivory-100"
              >
                {formatNumber(n)}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Field
              key={suggested || goal?.targetPv}
              label={t("targetLabel")}
              name="target"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              ltr
              defaultValue={suggested || goalState.values?.target || goal?.targetPv || ""}
              placeholder="2000"
              error={err(goalState.errors?.target)}
              required
            />
          </div>
          {goalState.errors?.form && (
            <div className="mt-3">
              <Notice tone="error">{err(goalState.errors.form)}</Notice>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={goalPending}>
              {goal ? t("save") : t("setGoal")}
            </Button>
            {goal && (
              <Button variant="outline" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-5">
          <p dir="ltr" className="text-start font-display text-4xl font-semibold tabular-nums">
            {formatNumber(goal.currentPv)}
            <span className="text-2xl text-ink-400"> / {formatNumber(goal.targetPv)} PV</span>
          </p>
          <div
            role="progressbar"
            aria-label={t("title")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-4 h-3 overflow-hidden rounded-full bg-ink-100"
          >
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", reached ? "bg-gold-400" : "bg-jade-500")}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            {reached ? (
              <p className="inline-flex items-center gap-1.5 font-bold text-jade-700">
                <CheckCircle2 className="size-4" aria-hidden /> {t("reached")}
              </p>
            ) : (
              <p className="font-semibold text-ink-700">{t("remaining", { remaining: formatNumber(remaining) })}</p>
            )}
            <p className="inline-flex items-center gap-1.5 text-ink-500">
              <CalendarClock className="size-4" aria-hidden /> {t("daysLeft", { count: daysLeft })}
            </p>
          </div>

          <form action={progressAction} key={goal.currentPv} className="mt-5 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                label={t("progressLabel")}
                name="current"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                ltr
                defaultValue={progressState.values?.current ?? goal.currentPv}
                error={err(progressState.errors?.current)}
                required
              />
            </div>
            <Button type="submit" size="lg" disabled={progressPending} className="mb-px">
              {t("save")}
            </Button>
          </form>
          {progressState.errors?.form && (
            <div className="mt-3">
              <Notice tone="error">{err(progressState.errors.form)}</Notice>
            </div>
          )}

          {nextUnlock && !reached && (
            <p className="mt-4 rounded-xl bg-gold-100 px-4 py-3 text-sm font-semibold leading-snug text-ink-800">
              {t("nextUnlock", { missing: formatNumber(nextUnlock.missing), title: nextUnlock.title, pv: formatNumber(nextUnlock.pv) })}
            </p>
          )}
        </div>
      )}

      {previous && (
        <p className="mt-4 text-sm text-ink-500">
          {t("previous", {
            month: previous.monthLabel,
            current: formatNumber(previous.currentPv),
            target: formatNumber(previous.targetPv),
          })}
        </p>
      )}
      <p className="mt-4 text-[0.8125rem] leading-snug text-ink-500">{t("selfNote")}</p>
    </section>
  );
}
