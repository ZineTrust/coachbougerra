import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { WORKSPACE_NAMESPACES, pickNamespaces } from "@/i18n/client-messages";

// The workspace is for staff only: keep it out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  // the workspace's interactive parts need their own wording in the browser
  const messages = pickNamespaces(await getMessages(), WORKSPACE_NAMESPACES);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
