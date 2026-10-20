import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Cairo, El_Messiri, Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/site/ServiceWorkerRegister";
import { PUBLIC_NAMESPACES, pickNamespaces } from "@/i18n/client-messages";
import { isRtl, routing } from "@/i18n/routing";
import { APPEARANCE_SCRIPT } from "@/lib/appearance";
import "../globals.css";

// French / Latin
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
// Arabic (each also covers Latin, for brand names inside Arabic text)
const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], display: "swap" });
const elMessiri = El_Messiri({
  variable: "--font-el-messiri",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: "%s · Coach Bougerra" },
    description: t("description"),
    alternates: { languages: { fr: "/fr", ar: "/ar" } },
  };
}

export const viewport: Viewport = { themeColor: "#08101d" };

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const fonts = [jakarta, fraunces, cairo, elMessiri].map((f) => f.variable).join(" ");
  const messages = pickNamespaces(await getMessages(), PUBLIC_NAMESPACES);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
      className={`${fonts} h-full antialiased`}
      // data-theme and data-text are set on <html> by the script below, before React starts
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
