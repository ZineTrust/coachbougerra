"use client";

import { useState } from "react";
import { Bell, CalendarPlus, KeyRound, LogIn, MessageSquare, Upload, Users, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTile } from "./ActionTile";
import { ComingSoonModal, ScheduleLiveModal } from "./WorkspaceModals";

type Modal = "start" | "join" | "schedule" | null;

/** Zoom-style home tiles. Each one only appears if this staff account may use it. */
export function DashboardActions({
  can,
}: {
  can: {
    lives: boolean;
    videos: boolean;
    notifications: boolean;
    members: boolean;
    messages: boolean;
    requests: boolean;
  };
}) {
  const t = useTranslations("space");
  const d = useTranslations("space.dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const close = () => setModal(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {can.lives && (
          <>
            <ActionTile icon={Video} label={d("startLive")} tone="gold" onClick={() => setModal("start")} />
            <ActionTile icon={LogIn} label={d("joinLive")} onClick={() => setModal("join")} />
            <ActionTile icon={CalendarPlus} label={d("scheduleLive")} onClick={() => setModal("schedule")} />
          </>
        )}
        {can.videos && (
          <ActionTile icon={Upload} label={d("publishVideo")} tone="ink" href="/espace/videos/nouvelle" />
        )}
        {can.messages && (
          <ActionTile icon={MessageSquare} label={d("readMessages")} href="/espace/messages" />
        )}
        {can.requests && (
          <ActionTile icon={KeyRound} label={d("unlockRequests")} tone="gold" href="/espace/demandes" />
        )}
        {can.notifications && (
          <ActionTile icon={Bell} label={d("sendNotification")} href="/espace/notifications" />
        )}
        {can.members && (
          <ActionTile icon={Users} label={d("viewMembers")} tone="ink" href="/espace/membres" />
        )}
      </div>

      {can.lives && (
        <>
          <ComingSoonModal open={modal === "start"} onClose={close} title={t("modals.startLive")} />
          <ComingSoonModal open={modal === "join"} onClose={close} title={t("modals.joinLive")} />
          <ScheduleLiveModal open={modal === "schedule"} onClose={close} />
        </>
      )}
    </>
  );
}
