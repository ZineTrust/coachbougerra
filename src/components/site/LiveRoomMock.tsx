import {
  Hand,
  Heart,
  Mic,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  Smile,
  Users,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, CoachPhoto } from "@/components/ui/Avatar";
import { LiveDot } from "@/components/ui/Badge";

/**
 * A static, Zoom-style preview of the live room. It is a picture of the future
 * product (the real room comes in the live-streaming phase), built in markup so
 * it stays sharp on every screen.
 */
export function LiveRoomMock() {
  const t = useTranslations("mock");

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[1.75rem] bg-ink-900 shadow-stage ring-1 ring-white/10">
        {/* room header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <LiveDot label={t("live")} />
            <p className="truncate text-sm font-semibold text-white">{t("roomTitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white">
            <Users className="size-3.5" aria-hidden /> <span dir="ltr">248</span>
          </div>
        </div>

        {/* stage */}
        <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl sm:aspect-[16/11]">
            <CoachPhoto photo="office" alt="Coach Bougerra" priority sizes="(min-width: 1024px) 34vw, 90vw" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/80 to-transparent" />
            <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <Mic className="size-3.5 text-jade-400" aria-hidden /> Coach Bougerra
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { name: "Zino S.", hue: 335 },
              { name: "Sofiane K.", hue: 210 },
              { name: "Nadia M.", hue: 30 },
            ].map((p) => (
              <div
                key={p.name}
                dir="ltr"
                className="relative grid flex-1 place-items-center overflow-hidden rounded-xl"
                style={{
                  background: `linear-gradient(135deg, hsl(${p.hue} 40% 24%), hsl(${p.hue + 30} 45% 13%))`,
                }}
              >
                <Avatar name={p.name} hue={p.hue} className="size-8 text-xs sm:size-10 sm:text-sm" />
                <span className="absolute inset-x-1 bottom-1 hidden truncate rounded bg-ink-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:block">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center justify-center gap-2 px-3 pb-4 pt-2 sm:gap-3">
          {[Mic, Video, MonitorUp, MessageSquare, Smile].map((Icon, i) => (
            <span
              key={i}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white sm:size-11"
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
          ))}
          <span className="ms-1 inline-flex h-10 items-center gap-2 rounded-full bg-live px-4 text-sm font-bold text-white sm:h-11">
            <PhoneOff className="size-4" aria-hidden /> {t("leave")}
          </span>
        </div>
      </div>

      {/* floating: chat */}
      <div className="absolute -bottom-14 -start-3 hidden w-60 rounded-2xl bg-white p-3.5 text-ink-900 shadow-lift sm:block lg:-start-10">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
          <MessageSquare className="size-3.5" aria-hidden /> {t("chat")}
        </p>
        <div className="space-y-2 text-[13px] leading-snug">
          <p className="rounded-xl rounded-ss-sm bg-ivory-100 px-3 py-2">
            <b className="text-jade-700">{t("asker")}&nbsp;:</b> {t("question")}
          </p>
          <p className="rounded-xl rounded-ss-sm bg-jade-50 px-3 py-2">
            <b className="text-jade-700">{t("host")}&nbsp;:</b> {t("answer")}
          </p>
        </div>
      </div>

      {/* floating: raised hand */}
      <div className="absolute -top-5 end-10 hidden items-center gap-2 rounded-full bg-white py-2 ps-2 pe-4 text-xs font-semibold text-ink-900 shadow-lift animate-float sm:flex">
        <span className="grid size-7 place-items-center rounded-full bg-gold-100 text-gold-600">
          <Hand className="size-4" aria-hidden />
        </span>
        {t("hand", { name: "Zino S." })}
      </div>

      {/* floating: reaction */}
      <div className="absolute -start-4 top-28 hidden size-11 place-items-center rounded-full bg-white text-live shadow-lift animate-float [animation-delay:-3s] sm:grid">
        <Heart className="size-5 fill-current" aria-hidden />
      </div>
    </div>
  );
}
