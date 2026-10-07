import { getDeviceId, getUserId } from '@amplitude/unified'
import { StableID, StatsigClient, type StatsigUser } from '@statsig/js-client'
import { getPlatformEventFields, getPlatformInfo } from './platform'

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

const nonEmpty = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined

/**
 * Statsig identity mirrors Amplitude so forwarded Statsig events land on the same Amplitude user:
 * stableID = Amplitude device_id, userID = Amplitude user_id. Amplitude must be initialized first;
 * if it is not, falls back to Statsig's own persisted stableID.
 * Gates with idType "stableID" require it on user.customIDs (not only in SDK storage).
 */
const buildStatsigUser = (sdkKey: string): StatsigUser => {
  const stableID = nonEmpty(getDeviceId()) ?? nonEmpty(StableID.get(sdkKey))
  const userID = nonEmpty(getUserId())
  const platformInfo = getPlatformInfo()

  return {
    ...(userID ? { userID } : {}),
    customIDs: stableID ? { stableID } : undefined,
    // Used by Dynamic Config / Gate rules that target custom_field os_family / platform.
    custom: {
      ...getPlatformEventFields(),
    },
    userAgent: platformInfo.userAgent || undefined,
  }
}

/**
 * Re-reads Amplitude's device ID / user ID and updates the Statsig user. Call after any Amplitude
 * identity change (login, logout/reset) so gates and logged events stay tied to the same user.
 */
export const syncStatsigIdentityWithAmplitude = async (): Promise<void> => {
  if (!client || !STATSIG_CLIENT_KEY) {
    return
  }
  await client.updateUserAsync(buildStatsigUser(STATSIG_CLIENT_KEY))
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

  const tierOverride = import.meta.env.VITE_STATSIG_TIER
  const environment =
    typeof tierOverride === 'string' && tierOverride.trim() !== ''
      ? { tier: tierOverride.trim() }
      : import.meta.env.DEV
        ? { tier: 'development' }
        : null

  const instance = new StatsigClient(
    STATSIG_CLIENT_KEY,
    buildStatsigUser(STATSIG_CLIENT_KEY),
    environment ? { environment } : null,
  )
  await instance.initializeAsync()
  client = instance

  if (import.meta.env.DEV) {
    const homepage = instance.getExperiment('homepage_revamp_test')
    const experiment = instance.getExperiment('hero_copy_test')
    const recs = instance.getExperiment('pdp_recs_test')
    const shipping = instance.getExperiment('checkout_shipping_test')
    const promo = instance.getDynamicConfig('cart_promo_rules')
    const freeShipping = instance.getDynamicConfig('free_shipping_rules')
    const platformBanner = instance.getDynamicConfig('platform_promo_banner')
    const context = instance.getContext()
    console.info('[Statsig] environment tier:', context.options?.environment?.tier ?? 'production (default)')
    console.info('[Statsig] Use this stableID for experiment overrides:', context.stableID)
    console.info('[Statsig] platform (user.custom + events):', context.user.custom)
    console.info('[Statsig] identity (mirrors Amplitude):', {
      stableID: context.user.customIDs?.stableID,
      amplitudeDeviceId: getDeviceId(),
      userID: context.user.userID,
    })
    console.info('[Statsig] homepage_revamp_test evaluation:', {
      groupName: homepage.groupName,
      reason: homepage.details.reason,
      homepage_variant: homepage.get('homepage_variant', null),
    })
    console.info('[Statsig] hero_copy_test evaluation:', {
      groupName: experiment.groupName,
      reason: experiment.details.reason,
      hero_headline: experiment.get('hero_headline', null),
      hero_primary_cta: experiment.get('hero_primary_cta', null),
    })
    console.info('[Statsig] pdp_recs_test evaluation:', {
      groupName: recs.groupName,
      reason: recs.details.reason,
      recs_headline: recs.get('recs_headline', null),
      recs_layout: recs.get('recs_layout', null),
    })
    console.info('[Statsig] checkout_shipping_test evaluation:', {
      groupName: shipping.groupName,
      reason: shipping.details.reason,
      express_label: shipping.get('express_label', null),
      emphasize_express: shipping.get('emphasize_express', null),
    })
    console.info('[Statsig] cart_promo_rules:', {
      reason: promo.details.reason,
      threshold_usd: promo.get('threshold_usd', null),
      discount_percent: promo.get('discount_percent', null),
    })
    console.info('[Statsig] free_shipping_rules:', {
      reason: freeShipping.details.reason,
      threshold_usd: freeShipping.get('threshold_usd', null),
    })
    console.info('[Statsig] platform_promo_banner:', {
      reason: platformBanner.details.reason,
      banner_eyebrow: platformBanner.get('banner_eyebrow', null),
      banner_text: platformBanner.get('banner_text', null),
    })
    console.info('[Statsig] gates:', {
      show_cart_coupon_15: instance.checkGate('show_cart_coupon_15'),
      show_low_stock_urgency: instance.checkGate('show_low_stock_urgency'),
      show_newsletter_modal: instance.checkGate('show_newsletter_modal'),
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

/**
 * Persisted anonymous unit ID used for stableID-targeted gates/experiments.
 * Prefer the live client context; fall back to StableID storage when needed.
 */
export const getStatsigStableID = (): string | null => {
  if (client) {
    const fromContext = client.getContext()?.stableID
    if (typeof fromContext === 'string' && fromContext.trim() !== '') {
      return fromContext
    }
    const fromCustomIDs = client.getContext()?.user?.customIDs?.stableID
    if (typeof fromCustomIDs === 'string' && fromCustomIDs.trim() !== '') {
      return fromCustomIDs
    }
  }

  if (!STATSIG_CLIENT_KEY) {
    return null
  }

  const fromStorage = StableID.get(STATSIG_CLIENT_KEY)
  return typeof fromStorage === 'string' && fromStorage.trim() !== '' ? fromStorage : null
}

export const logStatsigEvent = (
  eventName: string,
  value?: string | number,
  properties?: StatsigEventProperties,
): void => {
  if (!client) {
    return
  }

  // Always attach platform fields so Pulse / exports can slice iPhone vs Android.
  // Also mirror stableID into event metadata — Metrics “event properties” often hide
  // user.customIDs, which makes hero CTA clicks look like they have no unit ID.
  const platformFields = getPlatformEventFields()
  const stableID = getStatsigStableID()
  const metadata: Record<string, string> = {
    ...platformFields,
    ...(stableID ? { stableID } : {}),
  }
  for (const [key, raw] of Object.entries(properties ?? {})) {
    if (raw === undefined || raw === null) {
      continue
    }
    metadata[key] = typeof raw === 'string' ? raw : JSON.stringify(raw)
  }

  client.logEvent(eventName, value, metadata)
}
