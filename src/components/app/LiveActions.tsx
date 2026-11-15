"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BellRing, Copy, Ellipsis, Pencil, Radio, Trash2, Video, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cancelLiveAction, deleteLiveAction, duplicateLiveAction, remindLiveAction } from "@/actions/lives";
import type { FormState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { useErrorText } from "@/components/ui/form";
import { LiveFormModal, type LiveFormInitial, type VideoChoice } from "./LiveForm";
import { useToast } from "./Toast";

/** The buttons at the end of a live's row: open its room, and a small menu for everything else. */
export function LiveActions({
  live,
  reserved,
  videos,
  defaultStart,
}: {
  live: LiveFormInitial;
  reserved: number;
  videos: VideoChoice[];
  defaultStart: string;
}) {
  const t = useTranslations("space.lives");
  const err = useErrorText();
  const notify = useToast();
  const [pending, startTransition] = useTransition();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // the menu closes on a tap elsewhere or on Escape
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenu(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  const run = (task: () => Promise<FormState>, done?: (r: FormState) => void, confirmText?: string) => {
    setMenu(false);
    if (confirmText && !window.confirm(confirmText)) return;
    setProblem(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setProblem(err(result.errors?.form) ?? err("generic") ?? null);
      else done?.(result);
    });
  };

  const item =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm font-semibold text-ink-700 hover:bg-ivory-100 disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {live.status === "scheduled" && (
          <Button href={`/espace/lives/${live.id}`} variant="soft" size="sm">
            <Video className="size-4" aria-hidden /> {t("start")}
          </Button>
        )}
        {live.status === "live" && (
          <Button href={`/espace/lives/${live.id}`} variant="danger" size="sm">
            <Radio className="size-4" aria-hidden /> {t("openRoom")}
          </Button>
        )}
        {live.status === "ended" && (
          <Button href={`/espace/lives/${live.id}`} variant="outline" size="sm">
            {t("summary")}
          </Button>
        )}

        <div ref={box} className="relative">
          <button
            type="button"
            aria-label={t("more")}
            aria-expanded={menu}
            disabled={pending}
            onClick={() => setMenu((m) => !m)}
            className="grid size-9 place-items-center rounded-full text-ink-500 ring-1 ring-ink-200 hover:bg-ivory-100 hover:text-ink-900 disabled:opacity-50"
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
          {menu && (
            <div className="absolute end-0 top-11 z-20 w-60 overflow-hidden rounded-xl bg-white py-1 shadow-lift ring-1 ring-ink-900/10">
              <button
                type="button"
                className={item}
                onClick={() => {
                  setMenu(false);
                  setEditing(true);
                }}
              >
                <Pencil className="size-4 text-ink-400" aria-hidden /> {t("edit")}
              </button>
              {live.status === "scheduled" && (
                <button
                  type="button"
                  className={item}
                  disabled={reserved === 0}
                  onClick={() =>
                    run(
                      () => remindLiveAction(live.id),
                      (r) => notify(t("reminded", { count: Number(r.info?.warned ?? 0) })),
                      t("remindConfirm", { count: reserved }),
                    )
                  }
                >
                  <BellRing className="size-4 text-ink-400" aria-hidden /> {t("remind")}
                </button>
              )}
              <button
                type="button"
                className={item}
                onClick={() => run(() => duplicateLiveAction(live.id), () => notify(t("duplicated")))}
              >
                <Copy className="size-4 text-ink-400" aria-hidden /> {t("duplicate")}
              </button>
              {live.status === "scheduled" && (
                <button
                  type="button"
                  className={item}
                  onClick={() =>
                    run(
                      () => cancelLiveAction(live.id),
                      () => notify(t("cancelledDone")),
                      reserved > 0 ? t("cancelConfirmReserved", { count: reserved }) : t("cancelConfirm"),
                    )
                  }
                >
                  <XCircle className="size-4 text-ink-400" aria-hidden /> {t("cancel")}
                </button>
              )}
              {live.status !== "live" && (
                <button
                  type="button"
                  className={`${item} text-live`}
                  onClick={() => run(() => deleteLiveAction(live.id), () => notify(t("deleted")), t("deleteConfirm"))}
                >
                  <Trash2 className="size-4" aria-hidden /> {t("delete")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-xs font-semibold text-live">
          {problem}
        </p>
      )}
      <LiveFormModal
        open={editing}
        onClose={() => setEditing(false)}
        initial={live}
        defaultStart={defaultStart}
        videos={videos}
      />
    </div>
  );
}
