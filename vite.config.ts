import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  css: {
    transformer: "lightningcss",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Route TanStack Start's bundled server entry to src/server.ts (the SSR error wrapper).
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? [
          nitro({
            // Cloudflare Workers by default. Vercel: NITRO_PRESET=vercel.
            // Cloudflare Pages: NITRO_PRESET=cloudflare-pages.
            defaultPreset: process.env["NITRO_PRESET"] ?? "cloudflare-module",
            cloudflare: { nodeCompat: true },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
