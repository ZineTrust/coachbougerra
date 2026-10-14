import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and next/navigation helpers:
// every href gets the current language prefix (/fr/… or /ar/…) automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
