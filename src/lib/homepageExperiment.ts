import { useEffect } from 'react'
import { useExperiment } from '@statsig/react-bindings'

export const HOMEPAGE_REVAMP_EXPERIMENT = 'homepage_revamp_test'

export type HomepageVariant = 'control' | 'runway' | 'studio'

const VALID_VARIANTS = new Set<HomepageVariant>(['control', 'runway', 'studio'])

export const HOMEPAGE_OVERRIDE_KEY = 'homepage_variant_override'

/**
 * Dev-only variant pin. The query param is sticky for the tab session so the override survives
 * client-side navigation and reloads; `?homepage_variant=off` clears it.
 */
const readDevOverride = (): HomepageVariant | null => {
  if (typeof window === 'undefined') return null

  let stored: string | null = null
  try {
    const raw = new URLSearchParams(window.location.search).get('homepage_variant')
    if (raw === 'off') {
      window.sessionStorage.removeItem(HOMEPAGE_OVERRIDE_KEY)
      return null
    }
    if (raw && VALID_VARIANTS.has(raw as HomepageVariant)) {
      window.sessionStorage.setItem(HOMEPAGE_OVERRIDE_KEY, raw)
      return raw as HomepageVariant
    }
    stored = window.sessionStorage.getItem(HOMEPAGE_OVERRIDE_KEY)
  } catch {
    return null
  }

  return stored && VALID_VARIANTS.has(stored as HomepageVariant) ? (stored as HomepageVariant) : null
}

let warnedAboutMissingGroup = false

export const useHomepageVariant = (): HomepageVariant => {
  const experiment = useExperiment(HOMEPAGE_REVAMP_EXPERIMENT)
  const missingGroup = !experiment.groupName
  const reason = experiment.details.reason

  // Statsig returns no group and no parameters until the experiment is started, which makes
  // console overrides look broken. Surface it instead of silently serving Control.
  useEffect(() => {
    if (!import.meta.env.DEV || !missingGroup || warnedAboutMissingGroup) {
      return
    }
    warnedAboutMissingGroup = true
    console.warn(
      `[Statsig] ${HOMEPAGE_REVAMP_EXPERIMENT} returned no group (reason: ${reason}). ` +
        'Start the experiment for allocation and console overrides to apply, or use ?homepage_variant=runway|studio locally.',
    )
  }, [missingGroup, reason])

  const devOverride = import.meta.env.DEV ? readDevOverride() : null
  if (devOverride) {
    return devOverride
  }

  const raw = experiment.get('homepage_variant', 'control')
  if (typeof raw === 'string' && VALID_VARIANTS.has(raw as HomepageVariant)) {
    return raw as HomepageVariant
  }
  return 'control'
}
