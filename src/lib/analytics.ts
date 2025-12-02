import { init, track } from '@amplitude/analytics-browser'

type EventProperties = Record<string, string | number | boolean | null | undefined>

const AMPLITUDE_API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY ?? '5df5f04114dd4043d7fa68c45d08fa6a'

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

export const initAnalytics = (): void => {
  if (hasInitialized) {
    return
  }

  if (!AMPLITUDE_API_KEY) {
    warnMissingKey()
    return
  }

  init(AMPLITUDE_API_KEY, undefined, {
    defaultTracking: {
      pageViews: true,
      sessions: true,
      formInteractions: true,
    },
  })

  hasInitialized = true
}

export const trackEvent = (eventType: string, eventProperties?: EventProperties): void => {
  if (!hasInitialized) {
    initAnalytics()
  }

  if (!hasInitialized) {
    return
  }

  track(eventType, eventProperties)
}

export const isAnalyticsEnabled = (): boolean => hasInitialized

