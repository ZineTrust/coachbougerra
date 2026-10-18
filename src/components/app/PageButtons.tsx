"use client";

import { useState } from "react";
import { CalendarPlus, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { ComingSoonModal, ScheduleLiveModal } from "./WorkspaceModals";

/* Each button owns its modal so server pages can drop them in as plain elements. */

export function ScheduleLiveButton() {
  const t = useTranslations("space.lives");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="size-[18px]" aria-hidden /> {t("plan")}
      </Button>
      <ScheduleLiveModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function StartLiveButton({
  variant = "soft",
  size = "sm",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const t = useTranslations("space");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Video className="size-4" aria-hidden /> {t("lives.start")}
      </Button>
      <ComingSoonModal open={open} onClose={() => setOpen(false)} title={t("modals.startLive")} />
    </>
  );
}
