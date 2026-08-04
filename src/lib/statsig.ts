import { StableID, StatsigClient } from '@statsig/js-client'

/**
 * Statsig metadata values must be strings on the wire; arrays/objects (e.g. purchased items)
 * are JSON-encoded so a single event can carry the full list.
 */
type StatsigEventProperties = Record<string, string | number | boolean | null | undefined | object>

const rawStatsigKey = import.meta.env.VITE_STATSIG_CLIENT_KEY
const STATSIG_CLIENT_KEY =
  typeof rawStatsigKey === 'string' && rawStatsigKey.trim() !== '' ? rawStatsigKey.trim() : null

let client: StatsigClient | null = null

/**
 * In DEV, drop cached initialize payloads so console override flips (Test ↔ Control)
 * are picked up on refresh. Keeps stableID / session keys so identity stays stable.
 */
const clearCachedEvaluationsForDev = (): void => {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') {
    return
  }

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) {
      continue
    }
    if (key.startsWith('statsig.cached.') || key.startsWith('statsig.last_modified_time.')) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

/**
 * Creates and initializes the shared Statsig client. Call once from the app entry before
 * rendering; returns null (and logs a dev warning) when no client key is configured.
 */
export const initStatsig = async (): Promise<StatsigClient | null> => {
  if (client) {
    return client
  }

  if (!STATSIG_CLIENT_KEY) {
    if (import.meta.env.DEV) {
      console.warn('Statsig not initialized. Provide VITE_STATSIG_CLIENT_KEY in .env to enable feature gates.')
    }
    return null
  }

  clearCachedEvaluationsForDev()

  // Anonymous storefront: randomize gates/experiments on Statsig's persisted stableID.
  // Gates with idType "stableID" require it on user.customIDs (not only in SDK storage).
  const stableID = StableID.get(STATSIG_CLIENT_KEY)
  const tierOverride = import.meta.env.VITE_STATSIG_TIER
  const environment =
    typeof tierOverride === 'string' && tierOverride.trim() !== ''
      ? { tier: tierOverride.trim() }
      : import.meta.env.DEV
        ? { tier: 'development' }
        : null

  const instance = new StatsigClient(
    STATSIG_CLIENT_KEY,
    {
      customIDs: stableID ? { stableID } : undefined,
    },
    environment ? { environment } : null,
  )
  await instance.initializeAsync()
  client = instance

  if (import.meta.env.DEV) {
    const experiment = instance.getExperiment('hero_copy_test')
    const context = instance.getContext()
    console.info('[Statsig] environment tier:', context.options?.environment?.tier ?? 'production (default)')
    console.info('[Statsig] Use this stableID for experiment overrides:', context.stableID)
    console.info('[Statsig] hero_copy_test evaluation:', {
      groupName: experiment.groupName,
      reason: experiment.details.reason,
      hero_headline: experiment.get('hero_headline', null),
      hero_primary_cta: experiment.get('hero_primary_cta', null),
    })
  }

  if (typeof window !== 'undefined') {
    // Used by Playwright sims to flush batched events before the page closes.
    ;(window as typeof window & { __STATSIG_FLUSH__?: () => Promise<void> }).__STATSIG_FLUSH__ = () =>
      instance.flush()
  }

  return client
}

export const getStatsigClient = (): StatsigClient | null => client

export const logStatsigEvent = (
  eventName: string,
  value?: string | number,
  properties?: StatsigEventProperties,
): void => {
  if (!client) {
    return
  }

  const metadata: Record<string, string> = {}
  for (const [key, raw] of Object.entries(properties ?? {})) {
    if (raw === undefined || raw === null) {
      continue
    }
    metadata[key] = typeof raw === 'string' ? raw : JSON.stringify(raw)
  }

  client.logEvent(eventName, value, metadata)
}
