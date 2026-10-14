"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";

/** The member's number, big, with a one-tap copy button. */
export function CopyCode({ code }: { code: number }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <p dir="ltr" className="font-display text-6xl font-semibold tabular-nums tracking-tight text-white sm:text-7xl">
        {code}
      </p>
      <button
        type="button"
        onClick={async () => {
          // if copying is blocked the number is on screen anyway
          if (await copyText(String(code))) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
      >
        {copied ? <Check className="size-4 text-jade-300" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
