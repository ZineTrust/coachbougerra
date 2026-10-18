/*
  Only the texts that interactive (client) components need are sent to the
  browser. Visitors of the public site don't download the staff workspace's
  wording, and pages stay lighter.
*/

export const PUBLIC_NAMESPACES = [
  "common",
  "nav",
  "countdown",
  "errors",
  "auth",
  "library",
  "categories",
  "titles",
  "video",
  "contact",
  "bell",
  "toolbox",
  "profile",
  "pwa",
  "banner",
  "reserve",
  "unlock",
  "groups",
] as const;

export const WORKSPACE_NAMESPACES = [...PUBLIC_NAMESPACES, "space"] as const;

/** A copy of `messages` holding only the given top-level namespaces. */
export function pickNamespaces<T extends Record<string, unknown>>(
  messages: T,
  namespaces: readonly string[],
): Partial<T> {
  return Object.fromEntries(
    Object.entries(messages).filter(([key]) => namespaces.includes(key)),
  ) as Partial<T>;
}
