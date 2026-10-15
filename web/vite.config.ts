import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // Same-origin `/api/**` as on Firebase Hosting. Default: core-api on localhost:8080;
    // API_PROXY (e.g. https://noonealone.insidesync.ai in .env.local) targets a deployed one.
    proxy: {
      "/api": { target: loadEnv(mode, process.cwd(), "").API_PROXY || "http://localhost:8080", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: true,
    // Unit tests always use the mock, whatever .env.local selects for the dev server.
    env: { VITE_DATA_SOURCE: "mock" },
  },
}));
