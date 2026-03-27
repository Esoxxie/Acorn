/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/acorn-mask.svg"],
      manifest: {
        name: "Acorn",
        short_name: "Acorn",
        description: "Minimal calorie tracking with photo-first food logging.",
        theme_color: "#8f5a34",
        background_color: "#f5efe7",
        display: "standalone",
        start_url: "/",
        orientation: "portrait",
        categories: ["health", "lifestyle", "productivity"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "acorn-images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
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
