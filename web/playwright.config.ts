import { defineConfig } from "@playwright/test";

// E2E_PORT lets parallel runs use their own port (default 5174).
const PORT = Number(process.env.E2E_PORT ?? 5174);

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    // e2e covers the prototype pages: always the mock (process env outranks .env.local), on its own port so a
    // dev server running in live mode is never reused.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_DATA_SOURCE: "mock" },
  },
});
