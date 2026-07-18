import { defineConfig, devices } from "@playwright/test";
import { join } from "path";

const BACKEND = "http://127.0.0.1:3100";
const FRONTEND_PORT = 3200;
const FRONTEND = `http://127.0.0.1:${FRONTEND_PORT}`;

// Full-stack visitor e2e: a throwaway embedded-postgres + the built Nest server
// (khargny-backend/e2e-server.mjs) and the Next.js frontend pointed at it.
// Playwright manages both servers, so the visitor UI is exercised end-to-end
// against a real (local, disposable) backend.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: FRONTEND,
    trace: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "node e2e-server.mjs",
      cwd: join(__dirname, "..", "khargny-backend"),
      url: `${BACKEND}/v1/cities`,
      timeout: 120_000,
      reuseExistingServer: true,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npm run dev -- -p ${FRONTEND_PORT}`,
      cwd: __dirname,
      url: FRONTEND,
      timeout: 180_000,
      reuseExistingServer: true,
      env: {
        // The api hooks already prefix "/v1"; the base is the origin only.
        NEXT_PUBLIC_API_URL: BACKEND,
        NEXT_PUBLIC_BACKEND_BASE_URL: BACKEND,
        NEXT_PUBLIC_ENV: "e2e",
      },
    },
  ],
});
