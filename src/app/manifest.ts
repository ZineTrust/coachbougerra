import type { MetadataRoute } from "next";

/** Makes the site installable on a phone's home screen (served at /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Coach Bougerra",
    short_name: "Bougerra",
    description:
      "Formations, lives et communauté de Coach Bougerra · دورات وبثوث مباشرة ومجتمع كوتش بوقرة",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08101d",
    theme_color: "#08101d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
