import type { routing } from "@/i18n/routing";
import type { Messages } from "@/messages/fr";

// Gives translation keys full type-checking: a wrong key is a compile error,
// and Arabic must provide every key French has (see src/messages/ar.ts).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
