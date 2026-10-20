/*
  Where a formation's video lives. Either it is hosted elsewhere (YouTube, Vimeo…; we only
  keep which host and which video, and build the player address ourselves from an id made
  of safe characters, so a pasted link can never inject anything into the page), or it was
  uploaded from a phone to our own storage ("file": ref is the file's key there).
*/

export type HostedProvider = "youtube" | "vimeo";
export type VideoProvider = HostedProvider | "file";

export interface HostedSource {
  provider: HostedProvider;
  /** YouTube: the 11-character id. Vimeo: "123456789" or "123456789:privacyhash". */
  ref: string;
}

export interface FileSource {
  provider: "file";
  /** The file's key in the storage. Never shown to members: the player asks for a short-lived address. */
  ref: string;
}

export type VideoSource = HostedSource | FileSource;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/** Understands the usual ways of writing a link; null when it is none of them. */
export function parseVideoLink(input: string): HostedSource | null {
  const text = input.trim();
  if (!text) return null;

  // a bare YouTube id
  if (YOUTUBE_ID.test(text)) return { provider: "youtube", ref: text };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return parts[0] && YOUTUBE_ID.test(parts[0]) ? { provider: "youtube", ref: parts[0] } : null;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return { provider: "youtube", ref: fromQuery };
    const [kind, id] = parts;
    if (["embed", "shorts", "live", "v"].includes(kind ?? "") && id && YOUTUBE_ID.test(id)) {
      return { provider: "youtube", ref: id };
    }
    return null;
  }

  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/123456789, vimeo.com/123456789/abcdef0123 (unlisted), player.vimeo.com/video/123456789?h=abcdef0123
    const segments = parts[0] === "video" ? parts.slice(1) : parts;
    const id = segments[0];
    if (!id || !/^\d{6,12}$/.test(id)) return null;
    const hash = url.searchParams.get("h") ?? (segments[1] && /^[a-f0-9]{6,20}$/i.test(segments[1]) ? segments[1] : null);
    return { provider: "vimeo", ref: hash && /^[a-zA-Z0-9]{6,20}$/.test(hash) ? `${id}:${hash}` : id };
  }
  return null;
}

/** The address of the player to put in an iframe (hosted videos only). */
export function embedUrl(source: HostedSource): string {
  if (source.provider === "youtube") {
    // no suggested videos at the end, no logo, our own fullscreen button (fs=0) so the moving name stays on screen
    return `https://www.youtube-nocookie.com/embed/${source.ref}?rel=0&modestbranding=1&playsinline=1&fs=0&enablejsapi=1`;
  }
  const [id, hash] = source.ref.split(":");
  return `https://player.vimeo.com/video/${id}?${hash ? `h=${hash}&` : ""}dnt=1&playsinline=1&title=0&byline=0&portrait=0`;
}

/** A readable link to show back to staff in the editor ("" for an uploaded file: there is no link). */
export function sourceToLink(source: VideoSource): string {
  if (source.provider === "file") return "";
  if (source.provider === "youtube") return `https://youtu.be/${source.ref}`;
  const [id, hash] = source.ref.split(":");
  return `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`;
}

/* ------------------------------ uploaded files ------------------------------ */

/** What the phone may send: the container decides, so the extension is what counts. */
const FILE_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/mp4", // a .mov from an iPhone is the same container; browsers play it as mp4
  webm: "video/webm",
};

/** The type to store a file under, or null when it is not a video format we accept. */
export function videoFileType(name: string): { ext: string; mime: string } | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  const mime = ext ? FILE_TYPES[ext] : undefined;
  return ext && mime ? { ext, mime } : null;
}

/** 412 Mo, 1,3 Go… (binary units, as the phone's gallery shows them). */
export function formatBytes(bytes: number, locale: string): string {
  const units = locale === "ar" ? ["بايت", "ك.ب", "م.ب", "ج.ب"] : ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = i >= 3 ? 1 : 0;
  return `${new Intl.NumberFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR", { maximumFractionDigits: digits }).format(value)} ${units[i]}`;
}
