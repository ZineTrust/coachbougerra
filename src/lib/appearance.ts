/*
  How the site looks to one person: a theme (light, dark, or follow the phone) and a text size. It is a
  personal setting of the device, kept in the browser (localStorage), and applied as two attributes on
  <html> (data-theme, data-text) that the styles in globals.css / dark.css react to. A tiny script in the
  page head sets them before anything is drawn, so there is no flash of the wrong theme.
*/

export const THEME_KEY = "cb-theme";
export const TEXT_KEY = "cb-text";

export const THEMES = ["light", "dark", "auto"] as const;
export const TEXT_SIZES = ["md", "lg", "xl"] as const;

export type ThemePref = (typeof THEMES)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export interface Appearance {
  theme: ThemePref;
  text: TextSize;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "light", text: "md" };

const isTheme = (v: unknown): v is ThemePref => THEMES.includes(v as ThemePref);
const isText = (v: unknown): v is TextSize => TEXT_SIZES.includes(v as TextSize);

/** The choice made while storage is blocked (a private window): kept for the life of the page. */
let unsaved: Appearance | null = null;

/** What this browser has saved (the defaults when nothing is, or storage is blocked). */
export function readAppearance(): Appearance {
  if (unsaved) return unsaved;
  try {
    const theme = localStorage.getItem(THEME_KEY);
    const text = localStorage.getItem(TEXT_KEY);
    return { theme: isTheme(theme) ? theme : DEFAULT_APPEARANCE.theme, text: isText(text) ? text : DEFAULT_APPEARANCE.text };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** Puts the look on the page ("auto" is resolved to light or dark by the phone's own setting). */
export function applyAppearance({ theme, text }: Appearance) {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.text = text;
}

/* A tiny store, so a control always shows what is saved (and stays in step with other controls on the page). */
const listeners = new Set<() => void>();

export function subscribeAppearance(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The saved look as one string (so it is the same value until it really changes). */
export const appearanceSnapshot = (): string => {
  const { theme, text } = readAppearance();
  return `${theme}|${text}`;
};
export const serverAppearanceSnapshot = (): string => `${DEFAULT_APPEARANCE.theme}|${DEFAULT_APPEARANCE.text}`;
export const parseAppearance = (snapshot: string): Appearance => {
  const [theme, text] = snapshot.split("|");
  return { theme: isTheme(theme) ? theme : DEFAULT_APPEARANCE.theme, text: isText(text) ? text : DEFAULT_APPEARANCE.text };
};

export function saveAppearance(next: Appearance) {
  try {
    localStorage.setItem(THEME_KEY, next.theme);
    localStorage.setItem(TEXT_KEY, next.text);
    unsaved = null;
  } catch {
    // storage blocked (private window): the choice still applies until the page is closed
    unsaved = next;
  }
  applyAppearance(next);
  listeners.forEach((notify) => notify());
}

/** The same logic as readAppearance + applyAppearance, as text for the page head (it runs before React). */
export const APPEARANCE_SCRIPT = `(function(){try{var r=document.documentElement,t=localStorage.getItem("${THEME_KEY}"),s=localStorage.getItem("${TEXT_KEY}");if(t!=="dark"&&t!=="auto")t="light";if(s!=="lg"&&s!=="xl")s="md";var d=t==="dark"||(t==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.dataset.theme=d?"dark":"light";r.dataset.text=s}catch(e){}})()`;
