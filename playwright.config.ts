import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout et de sécurité HTTP, contre l'app lancée en local (`npm run build && npm start`)
 * ou contre une autre adresse : `BASE_URL=https://… npm run test:e2e`.
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
