"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellRing, Download, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/actions/progress";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/form";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface Environment {
  /** the browser can do push at all */
  supportsPush: boolean;
  ios: boolean;
  /** already running as an installed app */
  standalone: boolean;
  denied: boolean;
}

/** Read once, in the browser. The server snapshot (null) keeps server and browser HTML identical. */
let cached: Environment | null = null;
function readEnvironment(): Environment {
  if (!cached) {
    const nav = navigator as Navigator & { standalone?: boolean };
    cached = {
      supportsPush: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
      standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
      denied: "Notification" in window && Notification.permission === "denied",
    };
  }
  return cached;
}

function applicationServerKey(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** "On your phone": install the app, and switch on notifications for this device. */
export function PwaCard({ vapidPublicKey }: { vapidPublicKey: string }) {
  const t = useTranslations("pwa");
  const env = useSyncExternalStore(
    () => () => {},
    readEnvironment,
    () => null,
  );

  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [push, setPush] = useState<"checking" | "on" | "off" | "denied">("checking");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Chrome offers the install prompt through this event; we keep it for our own button
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // is this device already subscribed?
  useEffect(() => {
    if (!env?.supportsPush) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPush(Notification.permission === "denied" ? "denied" : sub ? "on" : "off"))
      .catch(() => setPush("off"));
  }, [env?.supportsPush]);

  if (!env) return null; // first server render: nothing yet

  const enable = () =>
    startTransition(async () => {
      setFailed(false);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPush("denied");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey(vapidPublicKey),
          }));
        const json = subscription.toJSON();
        const result = await savePushSubscriptionAction({
          endpoint: json.endpoint ?? "",
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
        if (result.ok) setPush("on");
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    });

  const disable = () =>
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPush("off");
      } catch {
        setFailed(true);
      }
    });

  const showInstall = !env.standalone && !installed && (installPrompt !== null || env.ios);

  return (
    <div className="space-y-6">
      {(env.standalone || installed) && (
        <p className="flex items-center gap-2.5 text-sm font-semibold text-jade-700">
          <Smartphone className="size-[18px]" aria-hidden /> {t("installed")}
        </p>
      )}

      {showInstall && (
        <div>
          <p className="text-sm leading-relaxed text-ink-600">{t("installHelp")}</p>
          {installPrompt ? (
            <Button
              className="mt-3"
              size="sm"
              onClick={async () => {
                await installPrompt.prompt();
                setInstallPrompt(null);
              }}
            >
              <Download className="size-4" aria-hidden /> {t("install")}
            </Button>
          ) : (
            <p className="mt-2.5 text-[13px] font-semibold text-ink-700">{t("iosHelp")}</p>
          )}
        </div>
      )}

      {vapidPublicKey && (
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <BellRing className="size-[18px] text-jade-600" aria-hidden /> {t("push")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">{t("pushHelp")}</p>

          <div className="mt-3">
            {!env.supportsPush ? (
              <Notice tone="info">{t("pushUnsupported")}</Notice>
            ) : push === "denied" || env.denied ? (
              <Notice tone="info">{t("pushDenied")}</Notice>
            ) : push === "on" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-jade-700">{t("pushOn")}</p>
                <Button size="sm" variant="outline" onClick={disable} disabled={pending}>
                  {t("pushDisable")}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={enable} disabled={pending || push === "checking"}>
                {t("pushEnable")}
              </Button>
            )}
            {failed && (
              <div className="mt-3">
                <Notice tone="error">{t("pushError")}</Notice>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
