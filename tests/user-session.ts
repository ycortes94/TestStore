import type { Page } from '@playwright/test'

export type SimulatedCohort = 'new' | 'returning'

export type PrimeSessionOptions = {
  cohort: SimulatedCohort
  /** Stable label for this simulated person, e.g. user-1 / user-2 */
  userLabel: string
}

/**
 * Prepares storage before the first navigation so the app can tag analytics like a
 * first visit vs someone who already had events “yesterday” (synthetic prior session).
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

  await page.addInitScript(
    ({ cohort, userLabel, priorAt, priorEventsJson }) => {
      try {
        sessionStorage.clear()
        localStorage.removeItem('e2e_sim_prior_events_v1')
      } catch {
        /* ignore */
      }

      sessionStorage.setItem('e2e_sim_persona', cohort)
      sessionStorage.setItem('e2e_sim_user_label', userLabel)

      if (cohort === 'returning') {
        sessionStorage.setItem('e2e_sim_prior_session_at', priorAt)
        localStorage.setItem('e2e_sim_prior_events_v1', priorEventsJson)
      }
    },
    {
      cohort: options.cohort,
      userLabel: options.userLabel,
      priorAt: priorSessionAt,
      priorEventsJson: JSON.stringify(priorDayEvents),
    },
  )
}
