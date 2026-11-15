"use client";

import { useState } from "react";
import { Bell, CalendarPlus, KeyRound, LogIn, MessageSquare, Upload, Users, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTile } from "./ActionTile";
import { LiveFormModal } from "./LiveForm";

/** Zoom-style home tiles. Each one only appears if this staff account may use it. */
export function DashboardActions({
  can,
  live,
}: {
  can: {
    lives: boolean;
    videos: boolean;
    notifications: boolean;
    members: boolean;
    messages: boolean;
    requests: boolean;
  };
  live: {
    /** the live whose room is open right now */
    onAirId: string | null;
    /** the next planned live */
    nextId: string | null;
    /** the suggested start of a new live, Algiers time */
    defaultStart: string;
  };
}) {
  const d = useTranslations("space.dashboard");
  const [planning, setPlanning] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {can.lives && (
          <>
            <ActionTile
              icon={Video}
              label={d("startLive")}
              tone="gold"
              href={live.nextId ? `/espace/lives/${live.nextId}` : "/espace/lives"}
            />
            <ActionTile
              icon={LogIn}
              label={d("joinLive")}
              href={live.onAirId ? `/espace/lives/${live.onAirId}` : "/espace/lives"}
            />
            <ActionTile icon={CalendarPlus} label={d("scheduleLive")} onClick={() => setPlanning(true)} />
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
        <LiveFormModal
          open={planning}
          onClose={() => setPlanning(false)}
          initial={null}
          defaultStart={live.defaultStart}
          videos={[]}
        />
      )}
    </>
  );
}
