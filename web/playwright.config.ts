import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:5174" },
  webServer: {
    // e2e covers the prototype pages: always the mock (process env outranks .env.local), on its own port so a
    // dev server running in live mode is never reused.
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    env: { VITE_DATA_SOURCE: "mock" },
  },
});
