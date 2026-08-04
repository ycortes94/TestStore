export const NEWSLETTER_SESSION_KEY = 'teststore.newsletter.seen'
export const NEWSLETTER_TRIGGER_EVENT = 'teststore:newsletter-trigger'

export type NewsletterTrigger = 'timer' | 'exit_intent' | 'manual' | 'query_param'

export const clearNewsletterSession = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  sessionStorage.removeItem(NEWSLETTER_SESSION_KEY)
}

export const isNewsletterForceShow = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  return new URLSearchParams(window.location.search).get('newsletter') === '1'
}

/** Shorter delay in DEV so support agents are not waiting 12s on every pass. */
export const getNewsletterDelayMs = (): number => (import.meta.env.DEV ? 4_000 : 12_000)

/** Skip automated browsers so Playwright sims are not blocked by the newsletter overlay. */
export const shouldSkipAutomatedBrowser = (): boolean =>
  Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver)

export const triggerNewsletterModal = (): void => {
  clearNewsletterSession()
  window.dispatchEvent(new CustomEvent(NEWSLETTER_TRIGGER_EVENT))
}
