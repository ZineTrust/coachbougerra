import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { ar } from "@/messages/ar";
import { fr } from "@/messages/fr";
import { routing } from "./routing";

const messages = { fr, ar } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return { locale, messages: messages[locale] };
});
