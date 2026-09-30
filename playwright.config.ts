import { defineConfig, devices } from '@playwright/test'

const simPort = process.env.PLAYWRIGHT_PORT ?? (process.env.CI ? '5180' : '5173')
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${simPort}`
const slowMo = process.env.PLAYWRIGHT_SLOW_MO ? Number(process.env.PLAYWRIGHT_SLOW_MO) : 0

// Run start for the experiment-traffic time budget (SIM_TIME_BUDGET_MS, see the spec).
// Set once in the runner process; worker processes inherit it via process.env.
process.env.SIM_STARTED_AT ??= String(Date.now())

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Customer sims set CI=true (dedicated Vite + production Statsig); override with PLAYWRIGHT_WORKERS.
  workers: process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : process.env.CI
      ? 2
      : 4,
  // Customer sims use slowMo + human pauses; long journeys (fitting call → checkout)
  // routinely exceed Playwright’s 30s default under CI.
  timeout: process.env.CI || slowMo > 0 ? 120_000 : 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: Number.isFinite(slowMo) && slowMo > 0 ? slowMo : undefined,
    },
  },
  // Chromium + device presets so Statsig sees desktop / android / iphone via UA.
  // Force browserName: chromium — iPhone presets default to WebKit, which GHA does not install.
  // Filter locally with --project=desktop|android|ios.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
    { name: 'android', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'ios', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${simPort} --strictPort`,
    url: baseURL,
    // When CI=true (customer sims / daily), never reuse a manual `npm run dev` that may be
    // missing VITE_STATSIG_TIER=production.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...process.env,
      // Morning/customer sims should land in production Statsig so Pulse can use them.
      VITE_STATSIG_TIER: process.env.VITE_STATSIG_TIER ?? 'production',
    },
  },
})
