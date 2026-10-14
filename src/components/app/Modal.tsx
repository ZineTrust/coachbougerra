"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Built on the native <dialog>: focus trapping, Escape-to-close and the
 * backdrop come from the browser instead of being re-implemented.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-3xl bg-white p-0 text-ink-900 shadow-lift backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[88dvh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-me-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ivory-100 hover:text-ink-900"
            aria-label={t("close")}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}
