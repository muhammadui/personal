import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests against the full local stack: Vite (5173) proxying to wrangler dev (8787)
 * with Docker Postgres. Start Postgres first: `pnpm db:up && pnpm db:migrate`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "pnpm --filter api dev", url: "http://localhost:8787/api/health", reuseExistingServer: true, timeout: 120_000 },
    { command: "pnpm --filter app dev", url: "http://localhost:5173", reuseExistingServer: true, timeout: 120_000 },
  ],
})
