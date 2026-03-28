/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: true,
        type: "module",
      },
      includeAssets: ["favicon.svg", "icons/acorn-mask.svg"],
      manifest: {
        name: "Acorn",
        short_name: "Acorn",
        description: "Acorn hält dein Ernährungsprotokoll griffbereit.",
        theme_color: "#141210",
        background_color: "#141210",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/acorn-mask.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/functions", "firebase/storage"],
          framework: ["react", "react-dom", "react-router-dom", "lucide-react"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    css: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/test/**/*.test.ts", "functions/src/**/*.test.ts"],
    exclude: ["src/test/e2e/**"],
  },
});
