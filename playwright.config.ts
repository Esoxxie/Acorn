import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "./src/test/e2e",
  timeout: 45_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "galaxy-s23",
      use: {
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
      },
    },
  ],
});
