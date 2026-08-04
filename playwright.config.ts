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
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: Number.isFinite(slowMo) && slowMo > 0 ? slowMo : undefined,
    },
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: {} }],
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
