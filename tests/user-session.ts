import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

export type SimulatedCohort = 'new' | 'returning'

export type PrimeSessionOptions = {
  cohort: SimulatedCohort
  /** Stable label for this simulated person, e.g. user-1 / exp-user-4 */
  userLabel: string
  /**
   * When set for returning users, Statsig will reuse this unit across runs.
   * Omit to derive a deterministic ID from `userLabel`.
   */
  stableID?: string
}

/** Same DJB2 Statsig uses for `statsig.stable_id.<hash>` storage keys. */
function djb2(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash = hash & hash
  }
  return String(hash >>> 0)
}

/** Deterministic UUID-shaped id so the same persona maps to the same Statsig unit. */
export function stableIdForPersona(userLabel: string): string {
  const hex = createHash('sha256').update(`teststore-return:${userLabel}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function statsigStableIdStorageKey(clientKey: string): string {
  return `statsig.stable_id.${djb2(`k:${clientKey}`)}`
}

/** Prefer process env; fall back to repo `.env` so local `npx playwright test` still seeds IDs. */
function resolveStatsigClientKey(): string {
  const fromEnv = process.env.VITE_STATSIG_CLIENT_KEY?.trim()
  if (fromEnv) {
    return fromEnv
  }

  try {
    const envPath = resolve(process.cwd(), '.env')
    const contents = readFileSync(envPath, 'utf8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      const match = /^VITE_STATSIG_CLIENT_KEY\s*=\s*(.*)$/.exec(trimmed)
      if (!match) {
        continue
      }
      return match[1].trim().replace(/^['"]|['"]$/g, '')
    }
  } catch {
    /* ignore missing .env */
  }

  return ''
}

/**
 * Prepares storage before the first navigation so the app can tag analytics like a
 * first visit vs someone who already had events “yesterday” (synthetic prior session).
 *
 * Returning users also get a deterministic Statsig `stableID` written into localStorage
 * so Pulse treats them as the same unit across daily runs (experiment bucketing is stableID).
 * Call once per test, before any `page.goto`.
 */
export async function primeUserSession(page: Page, options: PrimeSessionOptions): Promise<void> {
  await page.context().clearCookies()

  const priorSessionAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
  const priorDayEvents = [
    { type: 'home_viewed', at: priorSessionAt, totalProducts: 9 },
    { type: 'nav_tab_selected', at: priorSessionAt, tab: 'new-arrivals' },
    { type: 'filter_search_updated', at: priorSessionAt, queryLength: 5 },
    { type: 'cart_item_added', at: priorSessionAt, productId: 'city-trail-sneaker', name: 'City Trail Sneaker' },
  ]

  const clientKey = resolveStatsigClientKey()
  // Pin every simulated shopper to one homepage arm — used to reproduce a single arm locally.
  const forcedVariant = process.env.SIM_HOMEPAGE_VARIANT?.trim() || null
  const returningStableID =
    options.cohort === 'returning'
      ? (options.stableID ?? stableIdForPersona(options.userLabel))
      : null
  const stableIdStorageKey = clientKey ? statsigStableIdStorageKey(clientKey) : null

  if (options.cohort === 'returning' && !stableIdStorageKey && process.env.CI !== 'true') {
    console.warn(
      '[sim] VITE_STATSIG_CLIENT_KEY missing — returning user will not reuse a Statsig stableID.',
    )
  }

  await page.addInitScript(
    ({ cohort, userLabel, priorAt, priorEventsJson, returningStableID: seededId, stableIdKey, forcedVariant: variant }) => {
      try {
        sessionStorage.clear()
        localStorage.removeItem('e2e_sim_prior_events_v1')
      } catch {
        /* ignore */
      }

      sessionStorage.setItem('e2e_sim_persona', cohort)
      sessionStorage.setItem('e2e_sim_user_label', userLabel)
      // Must run after the clear above, which would otherwise drop the pin on every navigation.
      if (variant) {
        sessionStorage.setItem('homepage_variant_override', variant)
      }

      if (cohort === 'returning') {
        sessionStorage.setItem('e2e_sim_prior_session_at', priorAt)
        localStorage.setItem('e2e_sim_prior_events_v1', priorEventsJson)

        // Seed Statsig StableID before the SDK initializes so this unit is reused.
        if (seededId && stableIdKey) {
          try {
            localStorage.setItem(stableIdKey, JSON.stringify(seededId))
          } catch {
            /* ignore */
          }
        }
      }
    },
    {
      cohort: options.cohort,
      userLabel: options.userLabel,
      priorAt: priorSessionAt,
      priorEventsJson: JSON.stringify(priorDayEvents),
      returningStableID,
      stableIdKey: stableIdStorageKey,
      forcedVariant,
    },
  )
}
