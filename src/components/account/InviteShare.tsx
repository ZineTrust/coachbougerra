"use client";

import { useState } from "react";
import { Check, Copy, Download, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";

/** Draws the QR code (an SVG string) on a white canvas, with a margin, and downloads it as a PNG. */
async function downloadQr(svg: string, filename: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("QR image failed"));
      image.src = url;
    });
    const size = 1024;
    const margin = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = false; // keep the squares sharp
    context.drawImage(image, margin, margin, size - margin * 2, size - margin * 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The member's invitation link: copy it, send it on WhatsApp, share it, or show / save its QR code. */
export function InviteShare({
  url,
  message,
  qrSvg,
}: {
  url: string;
  /** the ready-made message, link included */
  message: string;
  /** the QR code as an SVG string made on the server */
  qrSvg: string;
}) {
  const t = useTranslations("invite");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async (what: "link" | "message") => {
    if (await copyText(what === "link" ? url : message)) {
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="text-base font-bold">{t("linkTitle")}</h2>
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            dir="ltr"
            value={url}
            aria-label={t("linkTitle")}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 rounded-xl bg-ivory-50 px-4 text-start text-sm font-semibold text-ink-700 ring-1 ring-ink-200"
          />
          <Button onClick={() => void copy("link")} size="lg" className="shrink-0">
            {copied === "link" ? <Check className="size-[18px]" aria-hidden /> : <Copy className="size-[18px]" aria-hidden />}
            <span className="max-sm:sr-only">{copied === "link" ? t("copied") : t("copyLink")}</span>
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1fa855] px-5 text-sm font-semibold text-white hover:bg-[#188f48]"
          >
            <MessageCircle className="size-[18px]" aria-hidden /> {t("whatsapp")}
          </a>
          {canShare && (
            <Button
              variant="outline"
              onClick={() => void navigator.share({ title: "Coach Bougerra", text: message, url }).catch(() => {})}
            >
              <Share2 className="size-[18px]" aria-hidden /> {t("share")}
            </Button>
          )}
          <Button variant="outline" onClick={() => void copy("message")}>
            {copied === "message" ? <Check className="size-[18px]" aria-hidden /> : <Copy className="size-[18px]" aria-hidden />}
            {copied === "message" ? t("copied") : t("copyMessage")}
          </Button>
        </div>

        <p
          dir="auto"
          className="mt-5 whitespace-pre-line rounded-xl bg-ivory-100 px-4 py-3 text-sm leading-relaxed text-ink-600 [overflow-wrap:anywhere]"
        >
          {message}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="text-base font-bold">{t("qrTitle")}</h2>
        <p className="mt-1 text-sm leading-snug text-ink-500">{t("qrHelp")}</p>
        {/* a QR code must stay dark on white in every theme, so its colours are written out */}
        <div
          role="img"
          aria-label={t("qrTitle")}
          className="mx-auto mt-4 aspect-square w-full max-w-60 rounded-2xl p-3 ring-1 ring-ink-900/10 [&>svg]:size-full"
          style={{ background: "#ffffff" }}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => void downloadQr(qrSvg, "coach-bougerra-invitation.png")}
        >
          <Download className="size-[18px]" aria-hidden /> {t("qrDownload")}
        </Button>
      </section>
    </div>
  );
}
