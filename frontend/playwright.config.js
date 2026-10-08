import { defineConfig, devices } from "@playwright/test";

// Screen matrix for v2 layout work (docs/plan-v2.md, C9). Specs tagged
// @matrix run only on these projects; all other specs run on mobile/desktop.
const touch = (width, height, scale = 2) => ({
  viewport: { width, height },
  deviceScaleFactor: scale,
  isMobile: true,
  hasTouch: true,
});
const matrix = {
  "phone-small": touch(320, 568),
  "iphone-se": touch(375, 667),
  "iphone-15": touch(393, 852, 3),
  "iphone-landscape": touch(852, 393, 3),
  "pixel-7": touch(412, 915, 2.6),
  "ipad-mini": touch(768, 1024),
  "ipad-landscape": touch(1180, 820),
  "surface-pro": { viewport: { width: 1368, height: 912 }, deviceScaleFactor: 2, hasTouch: true },
  notebook: { viewport: { width: 1440, height: 900 } },
  monitor: { viewport: { width: 1920, height: 1080 } },
  large: { viewport: { width: 2560, height: 1440 } },
};

// Parallel worktrees must use distinct ports: PW_PORT=4201 npx playwright test
const port = Number(process.env.PW_PORT) || 4173;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      grepInvert: /@matrix/,
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
    {
      name: "desktop",
      grepInvert: /@matrix/,
      use: { viewport: { width: 1360, height: 960 } },
    },
    ...Object.entries(matrix).map(([name, use]) => ({
      name,
      grep: /@matrix/,
      use: { ...use, defaultBrowserType: "chromium" },
    })),
  ],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
