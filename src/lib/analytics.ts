/**
 * Amplitude identity model (device ID, user ID, Amplitude ID):
 * https://amplitude.com/docs/data/sources/instrument-track-unique-users
 *
 * This storefront has no sign-in: we never call `setUserId`, so each browser is an anonymous
 * visitor identified by the Browser SDK’s persisted device ID (cookies / storage). That matches
 * Amplitude’s guidance for anonymous users — do not assign a placeholder user ID.
 *
 * Playwright simulations attach `e2e*` fields as **event properties** only; they are not Amplitude
 * `user_id` and do not affect unique-user identity.
 *
 * When you add accounts: call `setTrackedUserId` with a **stable** internal id after login; call
 * `resetToAnonymousVisitor` on logout (clears user id and rotates device id, per Amplitude).
 */
import {
  flush,
  getDeviceId,
  getSessionId,
  initAll,
  reset,
  sessionReplay,
  setUserId,
  track,
} from '@amplitude/unified'
import { getPlatformEventFields } from './platform'
import { getStatsigStableID } from './statsig'

/** Unified’s public `SessionReplayOptions` comes from standalone SR types and omits plugin-only flags; runtime accepts them (see Session Replay plugin docs). */
type UnifiedSessionReplayConfig = NonNullable<NonNullable<Parameters<typeof initAll>[1]>['sessionReplay']>

type EventProperties = Record<string, string | number | boolean | null | undefined>

const rawApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY
const AMPLITUDE_API_KEY =
  typeof rawApiKey === 'string' && rawApiKey.trim() !== '' ? rawApiKey.trim() : '5df5f04114dd4043d7fa68c45d08fa6a'

/** 0–1; defaults to 1 (all sessions). Override with VITE_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE. */
const sessionReplaySampleRate = Math.min(
  1,
  Math.max(0, Number(import.meta.env.VITE_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE ?? 1)),
)

/**
 * Remote config defaults to ON in the Browser SDK. If the fetch fails, Session Replay may capture
 * nothing for that session (Amplitude Session Replay plugin docs). Set `VITE_AMPLITUDE_FETCH_REMOTE_CONFIG=true`
 * to use dashboard remote settings (sampling, flags).
 */
const fetchRemoteConfig = import.meta.env.VITE_AMPLITUDE_FETCH_REMOTE_CONFIG === 'true'

/** rrweb focus heuristics often skip capture in Playwright / headless; debugMode relaxes that. */
const sessionReplayDebugMode =
  import.meta.env.DEV ||
  import.meta.env.VITE_AMPLITUDE_SESSION_REPLAY_DEBUG === 'true' ||
  (typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver))

let hasInitialized = false
let warnedMissingKey = false

const warnMissingKey = (): void => {
  if (warnedMissingKey || !import.meta.env.DEV) {
    warnedMissingKey = true
    return
  }

  console.warn('Amplitude not initialized. Provide VITE_AMPLITUDE_API_KEY to enable analytics.')
  warnedMissingKey = true
}

/**
 * Session Replay reads `deviceId` when the plugin runs `setup()`. If that runs before the
 * Browser SDK identity (device/session) is fully settled, replay payloads can disagree with
 * analytics events and Amplitude shows “Device ID mismatch”. After `initAll`, we align the
 * replay module with the same `deviceId` / `sessionId` the Analytics client uses.
 *
 * Do not set `sessionReplay.deviceId` in config unless it always matches Analytics — that
 * override is a common cause of mismatch ([Session Replay plugin](https://amplitude.com/docs/session-replay/session-replay-plugin)).
 */
async function alignSessionReplayWithAnalytics(): Promise<void> {
  const sr = sessionReplay()
  if (!sr) {
    return
  }

  const readIds = (): { deviceId: string | undefined; sessionId: number | undefined } => ({
    deviceId: getDeviceId(),
    sessionId: getSessionId(),
  })

  let { deviceId, sessionId } = readIds()
  if (!deviceId || sessionId === undefined) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
    ;({ deviceId, sessionId } = readIds())
  }

  if (!deviceId || sessionId === undefined) {
    if (import.meta.env.DEV) {
      console.warn(
        'Amplitude: could not align Session Replay — deviceId or sessionId missing after init.',
      )
    }
    return
  }

  try {
    await sr.setSessionId(sessionId, deviceId).promise
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Amplitude: Session Replay identity alignment failed', error)
    }
  }
}

/**
 * Initializes the [Amplitude Unified SDK](https://amplitude.com/docs/sdks/analytics/browser/browser-unified-sdk):
 * Analytics (browser) + Session Replay via `sessionReplay.sampleRate`.
 * Call once from the app entry before rendering so `track` is safe.
 */
export const initAnalytics = async (): Promise<void> => {
  if (hasInitialized) {
    return
  }

  if (!AMPLITUDE_API_KEY) {
    warnMissingKey()
    return
  }

  await initAll(AMPLITUDE_API_KEY, {
    serverZone: 'US',
    instanceName: '$default_instance',
    analytics: {
      fetchRemoteConfig,
      defaultTracking: {
        pageViews: true,
        sessions: true,
        formInteractions: true,
      },
    },
    sessionReplay: {
      sampleRate: sessionReplaySampleRate,
      // Session Start / End events link replay to analytics; required for correct playback in many Amplitude views.
      forceSessionTracking: true,
      // Fallback when client-side routing does not go through History API alone (SPA).
      enableUrlChangePolling: true,
      // Mask PII inputs marked with data-amp-mask / .amp-mask (newsletter, notify me, fitting call).
      privacyConfig: {
        maskSelector: ['.amp-mask', 'input[type="email"]', 'input[data-amp-mask]', '[data-amp-mask]'],
      },
      ...(sessionReplayDebugMode ? { debugMode: true } : {}),
    } as UnifiedSessionReplayConfig,
  })

  await alignSessionReplayWithAnalytics()

  const flushOnHide = (): void => {
    void flush()
    const sr = sessionReplay()
    if (sr) {
      void sr.flush(false).catch(() => undefined)
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnHide()
    }
  })
  window.addEventListener('pagehide', flushOnHide)

  hasInitialized = true
}

const getE2eSimulationProps = (): EventProperties => {
  if (typeof sessionStorage === 'undefined' || typeof localStorage === 'undefined') {
    return {}
  }

  try {
    const cohort = sessionStorage.getItem('e2e_sim_persona')
    if (!cohort) {
      return {}
    }

    const props: EventProperties = {
      e2eCohort: cohort,
      e2eUserLabel: sessionStorage.getItem('e2e_sim_user_label') ?? '',
    }

    const priorAt = sessionStorage.getItem('e2e_sim_prior_session_at')
    if (priorAt) {
      props.e2ePriorSessionAt = priorAt
    }

    try {
      const raw = localStorage.getItem('e2e_sim_prior_events_v1')
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          props.e2eSimulatedPriorEventCount = parsed.length
        }
      }
    } catch {
      /* ignore */
    }

    return props
  } catch {
    return {}
  }
}

export const trackEvent = (eventType: string, eventProperties?: EventProperties): void => {
  if (!hasInitialized) {
    return
  }

  const e2e = getE2eSimulationProps()
  const platform = getPlatformEventFields()
  const statsigStableID = getStatsigStableID()
  void track(eventType, {
    ...platform,
    ...(statsigStableID ? { statsigStableID } : {}),
    ...eventProperties,
    ...e2e,
  })
}

export const isAnalyticsEnabled = (): boolean => hasInitialized

/**
 * After login: set the Amplitude user id to a **stable** value that will not change for that
 * account (not a display name). Anonymous events on this device are attributed to this user.
 */
export const setTrackedUserId = (userId: string): void => {
  if (!hasInitialized) {
    return
  }
  setUserId(userId)
}

/**
 * After logout: clear `user_id` and generate a new device id so later events are a fresh anonymous
 * visitor (see Amplitude “track unique users” — logout / anonymous behavior). Re-aligns Session
 * Replay with the new device id.
 */
export const resetToAnonymousVisitor = async (): Promise<void> => {
  if (!hasInitialized) {
    return
  }
  reset()
  await alignSessionReplayWithAnalytics()
}
