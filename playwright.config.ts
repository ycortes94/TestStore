import { defineConfig, devices } from '@playwright/test'

const simPort = process.env.PLAYWRIGHT_PORT ?? (process.env.CI ? '5180' : '5173')
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${simPort}`
const slowMo = process.env.PLAYWRIGHT_SLOW_MO ? Number(process.env.PLAYWRIGHT_SLOW_MO) : 0

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 6,
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
