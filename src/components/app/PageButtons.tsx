"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LiveFormModal, type VideoChoice } from "./LiveForm";

/* Each button owns its modal so server pages can drop them in as plain elements. */

export function ScheduleLiveButton({ defaultStart, videos }: { defaultStart: string; videos: VideoChoice[] }) {
  const t = useTranslations("space.lives");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="size-[18px]" aria-hidden /> {t("plan")}
      </Button>
      <LiveFormModal open={open} onClose={() => setOpen(false)} initial={null} defaultStart={defaultStart} videos={videos} />
    </>
  );
}
