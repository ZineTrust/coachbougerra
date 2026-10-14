import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Redirects "/" and any path without a language to /fr/… or /ar/…
// (using the visitor's saved choice or browser language).
export default createMiddleware(routing);

export const config = {
  // everything except API routes, Next internals and files with an extension
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
