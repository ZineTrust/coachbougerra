"use client";

import { useState, useTransition } from "react";
import { Hand, Mic, UserMinus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RemoteParticipant } from "livekit-client";
import { removeParticipantAction, setStageAction } from "@/actions/liveRoom";
import { cn } from "@/lib/utils";

/** The host's list of who is in the room: raised hands first, with the buttons to bring someone on stage. */
export function PeoplePanel({ liveId, people }: { liveId: string; people: RemoteParticipant[] }) {
  const t = useTranslations("liveRoom");
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState(false);

  const members = people
    .filter((p) => p.identity.startsWith("member:"))
    .sort((a, b) => Number(b.attributes?.hand === "1") - Number(a.attributes?.hand === "1") || (a.name ?? "").localeCompare(b.name ?? ""));

  const act = (task: () => Promise<{ ok?: boolean }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setProblem(false);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setProblem(true);
    });
  };

  if (members.length === 0) {
    return <p className="px-4 py-10 text-center text-sm leading-relaxed text-ink-400">{t("peopleEmpty")}</p>;
  }

  const button =
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold disabled:opacity-50";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {problem && (
        <p role="alert" className="px-4 pt-3 text-xs font-semibold text-live">
          {t("actionFailed")}
        </p>
      )}
      <ul className="divide-y divide-white/10">
        {members.map((p) => {
          const hand = p.attributes?.hand === "1";
          const onStage = Boolean(p.permissions?.canPublish);
          const name = p.name || p.identity;
          return (
            <li key={p.identity} className={cn("flex items-center gap-3 px-4 py-3", hand && "bg-gold-400/10")}>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate text-sm font-semibold text-white">
                  {name}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                  {hand && (
                    <span className="inline-flex items-center gap-1 font-bold text-gold-300">
                      <Hand className="size-3.5" aria-hidden /> {t("handUp")}
                    </span>
                  )}
                  {onStage && (
                    <span className="inline-flex items-center gap-1 font-bold text-jade-300">
                      <Mic className="size-3.5" aria-hidden /> {t("onStage")}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => setStageAction(liveId, p.identity, !onStage))}
                className={cn(button, onStage ? "bg-white/10 text-white hover:bg-white/20" : "bg-jade-600 text-white hover:bg-jade-500")}
              >
                {onStage ? <UserMinus className="size-3.5" aria-hidden /> : <Mic className="size-3.5" aria-hidden />}
                {onStage ? t("removeFromStage") : t("inviteOnStage")}
              </button>
              <button
                type="button"
                disabled={pending}
                aria-label={t("removeFromRoom")}
                title={t("removeFromRoom")}
                onClick={() => act(() => removeParticipantAction(liveId, p.identity), t("removeConfirm", { name }))}
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-300 hover:bg-live/20 hover:text-live disabled:opacity-50"
              >
                <UserX className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
