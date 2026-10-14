"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Radio, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { setLiveNowAction } from "@/actions/lives";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/** Staff: flag a live as on air (the whole site shows the red banner) or end it. */
export function LiveOnAirButton({ liveId, onAir }: { liveId: string; onAir: boolean }) {
  const t = useTranslations("space.lives");
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useOptimistic(onAir);

  const toggle = () => {
    setFailed(false);
    startTransition(async () => {
      setShown(!shown);
      const result = await setLiveNowAction(shown ? null : liveId);
      if (!result.ok) setFailed(true);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {shown && (
          <Badge tone="live">
            <Radio className="size-3" aria-hidden /> {t("onAir")}
          </Badge>
        )}
        <Button variant={shown ? "outline" : "danger"} size="sm" disabled={pending} onClick={toggle}>
          {shown ? <Square className="size-3.5" aria-hidden /> : <Radio className="size-4" aria-hidden />}
          {shown ? t("endLive") : t("goLive")}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-xs font-semibold text-live">
          {t("liveError")}
        </p>
      )}
    </div>
  );
}
