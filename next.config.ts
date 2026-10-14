import path from "node:path";
import type { NextConfig } from "next";

/*
  next-intl finds our language setup (src/i18n/request.ts) through an alias named
  "next-intl/config". Normally `createNextIntlPlugin()` sets it, but that plugin
  loads a native compiler add-on (@swc/core) that we don't use and that fails to
  start on some Windows setups. So we set the same alias by hand, for both
  bundlers (Turbopack is the default; webpack is the fallback).
*/
const I18N_REQUEST_CONFIG = "./src/i18n/request.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Database drivers are loaded on the server only and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "sharp", "web-push"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // profile photos are shrunk in the browser first, but allow a little room above the 1 MB default
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  // the service worker must always be re-checked, never served from an old cache
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: { "next-intl/config": I18N_REQUEST_CONFIG },
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["next-intl/config"] = path.resolve(
      config.context ?? process.cwd(),
      I18N_REQUEST_CONFIG,
    );
    return config;
  },
};

export default nextConfig;
