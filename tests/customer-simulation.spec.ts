import { expect, test, type Locator, type Page } from '@playwright/test'
import { primeUserSession, type SimulatedCohort } from './user-session'

async function flushStatsig(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const flush = (globalThis as { __STATSIG_FLUSH__?: () => Promise<void> }).__STATSIG_FLUSH__
    if (flush) {
      await flush()
    }
  })
}

test.afterEach(async ({ page }) => {
  await flushStatsig(page).catch(() => {
    /* page may already be closed */
  })
})


function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function envMs(key: 'SIM_HUMAN_MIN_MS' | 'SIM_HUMAN_MAX_MS', fallback: number): number {
  const n = Number(process.env[key])
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * Random “think” pauses so the app (and Session Replay) have time to record DOM updates and events.
 * Override bounds with `SIM_HUMAN_MIN_MS` / `SIM_HUMAN_MAX_MS` (e.g. in CI).
 */
async function humanPause(page: Page, minMs?: number, maxMs?: number): Promise<void> {
  const min = minMs ?? envMs('SIM_HUMAN_MIN_MS', 600)
  const max = maxMs ?? envMs('SIM_HUMAN_MAX_MS', 1_450)
  const hi = Math.max(min, max)
  const lo = Math.min(min, max)
  await page.waitForTimeout(randInt(lo, hi))
}

/** Short settle time after small UI changes (tabs, chips). */
async function humanMicroPause(page: Page, minMs = 220, maxMs = 560): Promise<void> {
  await page.waitForTimeout(randInt(minMs, maxMs))
}

/** Types like a person (character delays), not an instant `.fill()`. */
async function humanType(page: Page, locator: Locator, text: string): Promise<void> {
  await locator.click()
  await humanMicroPause(page, 120, 300)
  await locator.pressSequentially(text, { delay: randInt(55, 125) })
}

async function openCatalog(page: Page): Promise<void> {
  await page.goto('/')
  await openHeroCatalog(page)
}

/** Primary hero CTA — Control ("Explore the edit") or Test ("Shop new arrivals"). */
function heroPrimaryCta(page: Page): Locator {
  return page.getByRole('button', { name: /Explore the edit|Shop new arrivals/i })
}

/** Use when the page is already on a shopping tab (do not call `page.goto` first). */
async function openHeroCatalog(page: Page): Promise<void> {
  await heroPrimaryCta(page).click()
  await humanMicroPause(page, 280, 680)
  await expect(page.getByRole('searchbox')).toBeVisible()
}

async function goToTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('tab', { name: tabName }).click()
  await humanPause(page, 400, 920)
}

/** Completes the Book a fitting call modal end-to-end (Statsig `fitting_call_scheduled`). */
async function bookFittingCall(
  page: Page,
  persona: { name: string; email: string; notes?: string },
): Promise<void> {
  await page.getByRole('button', { name: 'Book a fitting call' }).click()
  const dialog = page.getByRole('dialog', { name: /Book a fitting call/i })
  await expect(dialog).toBeVisible()
  await humanPause(page, 400, 900)

  await humanType(page, dialog.getByLabel('Name'), persona.name)
  await humanMicroPause(page)
  await humanType(page, dialog.getByLabel('Email'), persona.email)
  await humanMicroPause(page)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const preferredDate = tomorrow.toISOString().slice(0, 10)
  await dialog.getByLabel('Preferred date').fill(preferredDate)
  await humanMicroPause(page)

  const timeSlots = ['09:00', '11:00', '13:00', '15:00', '17:00'] as const
  await dialog.getByLabel('Time').selectOption(timeSlots[randInt(0, timeSlots.length - 1)])
  await humanMicroPause(page)

  if (persona.notes) {
    await humanType(page, dialog.getByLabel(/Notes/i), persona.notes)
    await humanMicroPause(page)
  }

  await dialog.getByRole('button', { name: 'Schedule fitting call' }).click()
  await expect(page.getByRole('heading', { name: /You.?re on the calendar/i })).toBeVisible()
  await humanPause(page, 500, 1_100)
  await page.getByRole('button', { name: 'Back to shopping' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await humanMicroPause(page, 300, 720)
  await flushStatsig(page)
}

/** Fills bag, runs checkout through Place order, closes thank-you modal. */
async function completePurchase(page: Page): Promise<void> {
  await humanPause(page, 430, 1_000)
  await page.getByRole('button', { name: 'Continue to checkout' }).click()
  await expect(page.getByRole('dialog', { name: /Review your order/i })).toBeVisible()
  await humanPause(page, 600, 1_320)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByRole('heading', { name: /Thanks — your order is in/i })).toBeVisible()
  await humanPause(page, 530, 1_180)
  await page.getByRole('button', { name: 'Back to shopping' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await humanMicroPause(page, 300, 720)
  await expect(page.getByText('Add a few products to see them here.')).toBeVisible()
  await flushStatsig(page)
}

function registerShoppersSuite(cohort: SimulatedCohort, userLabel: string): void {
  const suiteTitle =
    cohort === 'new'
      ? `simulated shoppers — new user (${userLabel})`
      : `simulated shoppers — returning user (${userLabel}; prior session ~yesterday)`

  test.describe.parallel(suiteTitle, () => {
    test.beforeEach(async ({ page }) => {
      await primeUserSession(page, { cohort, userLabel })
    })

    test('first-time visitor filters footwear, fills bag, and purchases', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await humanPause(page)
      await openCatalog(page)

      await page.getByRole('button', { name: 'Footwear', exact: true }).click()
      await humanMicroPause(page)
      await humanType(page, page.getByRole('searchbox'), 'trail')
      await humanMicroPause(page)
      await page.getByRole('checkbox', { name: /only show in-stock/i }).check()
      await humanMicroPause(page)
      await page.getByLabel('Sort').selectOption('price-asc')
      await humanPause(page, 380, 880)

      const addButtons = page.getByRole('button', { name: 'Add to bag' })
      await addButtons.first().click()
      await humanPause(page, 470, 1080)
      await addButtons.first().click()
      await humanMicroPause(page)
      await page.getByRole('button', { name: /Add one City Trail Sneaker/i }).click()

      await expect(page.getByRole('button', { name: 'Continue to checkout' })).toBeEnabled()
      await completePurchase(page)

      await humanPause(page)
      await page.getByRole('link', { name: 'Shipping policy' }).scrollIntoViewIfNeeded()
      await humanMicroPause(page)
    })

    test('comparison shopper uses apparel price cap then completes a purchase', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('button', { name: 'Apparel', exact: true }).click()
      await humanPause(page)
      await page.locator('section.filters input[type="range"]').fill('150')
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await expect(page.getByRole('button', { name: 'Clear' })).toBeEnabled()
      await humanPause(page, 400, 950)
      await completePurchase(page)

      await page.getByRole('button', { name: 'Gear', exact: true }).click()
      await humanMicroPause(page)
      await page.getByLabel('Sort').selectOption('rating')
      await humanPause(page)
    })

    test('window shopper books a fitting call then buys a drinkware bundle', async ({ page }) => {
      await page.goto('/')
      await humanPause(page)
      await page.getByRole('heading', { name: /Layer smart/i }).scrollIntoViewIfNeeded()
      await humanMicroPause(page)
      await bookFittingCall(page, {
        name: `${userLabel} Shopper`,
        email: `${userLabel.replace(/\W+/g, '-')}@example.com`,
        notes: 'Looking for breathable layers for morning runs.',
      })
      await openCatalog(page)

      await humanType(page, page.getByRole('searchbox'), 'hydration')
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await completePurchase(page)

      await page.getByRole('contentinfo').scrollIntoViewIfNeeded()
      await humanMicroPause(page)
      await expect(page.getByRole('link', { name: 'Careers' })).toBeVisible()
    })

    test('gift buyer searches giftable and checks out', async ({ page }) => {
      await openCatalog(page)
      await humanType(page, page.getByRole('searchbox'), 'gift')
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await completePurchase(page)
    })

    test('accessories loyalist shops category and purchases', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('button', { name: 'Accessories', exact: true }).click()
      await humanPause(page, 350, 820)
      await page.getByLabel('Sort').selectOption('price-desc')
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).nth(1).click()
      await completePurchase(page)
    })

    test('deal hunter sorts price high to low and buys the top listing', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('button', { name: 'All', exact: true }).click()
      await humanMicroPause(page)
      await page.getByLabel('Sort').selectOption('price-desc')
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await completePurchase(page)
    })

    test('multi-category cart: gear then footwear, single purchase', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('button', { name: 'Gear', exact: true }).click()
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await humanPause(page, 470, 1080)
      await page.getByRole('button', { name: 'Footwear', exact: true }).click()
      await humanMicroPause(page)
      await page.getByRole('checkbox', { name: /only show in-stock/i }).check()
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Continue to checkout' })).toBeEnabled()
      await humanPause(page, 540, 1180)
      await page.getByRole('button', { name: 'Continue to checkout' }).click()
      const review = page.getByRole('dialog', { name: /Review your order/i })
      await expect(review).toBeVisible()
      await humanPause(page, 470, 1080)
      await expect(review.getByText('Running Essentials Kit')).toBeVisible()
      await expect(review.getByText('City Trail Sneaker')).toBeVisible()
      await humanPause(page, 590, 1240)
      await page.getByRole('button', { name: 'Place order' }).click()
      await expect(page.getByRole('heading', { name: /Thanks — your order is in/i })).toBeVisible()
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Back to shopping' }).click()
    })

    test('in-stock purist toggles filter and abandons checkout once', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('checkbox', { name: /only show in-stock/i }).check()
      await humanPause(page, 380, 880)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await humanPause(page, 430, 960)
      await page.getByRole('button', { name: 'Continue to checkout' }).click()
      await expect(page.getByRole('dialog', { name: /Review your order/i })).toBeVisible()
      await humanPause(page, 540, 1180)
      await page.getByRole('button', { name: 'Keep shopping' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await humanPause(page, 470, 1080)
      await page.getByRole('button', { name: 'Continue to checkout' }).click()
      await humanPause(page, 600, 1320)
      await page.getByRole('button', { name: 'Place order' }).click()
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Back to shopping' }).click()
    })

    test('running shopper uses top-rated sort and purchases', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('button', { name: 'Gear', exact: true }).click()
      await humanMicroPause(page)
      await page.getByLabel('Sort').selectOption('rating')
      await humanPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await completePurchase(page)
    })
  })
}

function registerTabJourneysSuite(cohort: SimulatedCohort, userLabel: string): void {
  const suiteTitle =
    cohort === 'new'
      ? `simulated tab journeys — new user (${userLabel})`
      : `simulated tab journeys — returning user (${userLabel}; prior session ~yesterday)`

  test.describe.parallel(suiteTitle, () => {
    test.beforeEach(async ({ page }) => {
      await primeUserSession(page, { cohort, userLabel })
    })

    test('New Arrivals: new-only toggle, filter, and purchase', async ({ page }) => {
      await page.goto('/')
      await humanPause(page, 400, 950)
      await goToTab(page, 'New Arrivals')
      await expect(page.getByRole('heading', { name: /New arrivals/i })).toBeVisible()
      await humanMicroPause(page)
      await page.getByRole('checkbox', { name: /Show only products tagged/i }).check()
      await humanPause(page, 380, 880)
      await openHeroCatalog(page)
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Add to bag' }).click()
      await completePurchase(page)
    })

    test('Best Sellers: ranking chips and purchase', async ({ page }) => {
      await page.goto('/')
      await humanPause(page, 400, 950)
      await goToTab(page, 'Best Sellers')
      await expect(page.getByRole('heading', { name: /Best sellers/i })).toBeVisible()
      await page.getByRole('button', { name: 'Most reviewed' }).click()
      await humanPause(page, 430, 1020)
      await page.getByRole('button', { name: 'Highest rated' }).click()
      await humanPause(page, 430, 1020)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await completePurchase(page)
    })

    test('Studio Kits: add Sunrise Miles kit and purchase', async ({ page }) => {
      await page.goto('/')
      await humanPause(page, 400, 950)
      await goToTab(page, 'Studio Kits')
      await expect(page.getByRole('heading', { name: /Studio kits/i })).toBeVisible()
      await humanMicroPause(page)
      await page
        .locator('.kit-card')
        .filter({ has: page.getByRole('heading', { name: 'Sunrise Miles' }) })
        .getByRole('button', { name: 'Add kit to bag' })
        .click()
      await completePurchase(page)
    })

    test('Journal: expand a story and use copy title', async ({ page }) => {
      await page.goto('/')
      await humanPause(page, 400, 950)
      await goToTab(page, 'Journal')
      await expect(page.getByRole('heading', { name: /Journal/i })).toBeVisible()
      const firstPost = page.locator('.journal-card').first()
      await humanMicroPause(page)
      await firstPost.getByRole('button', { name: /Why we lab-test every fabric batch/i }).click()
      await humanPause(page, 470, 1120)
      await expect(firstPost.getByText(/Each textile spends 72 hours/i)).toBeVisible()
      await humanMicroPause(page)
      await firstPost.getByRole('button', { name: 'Copy title' }).click()
    })

    test('Support: form, FAQs, and chat demo', async ({ page }) => {
      await page.goto('/')
      await humanPause(page, 400, 950)
      await goToTab(page, 'Support')
      await expect(page.getByRole('heading', { name: /Support/i })).toBeVisible()
      await humanMicroPause(page)
      await page.getByLabel('Topic').selectOption('returns')
      await humanPause(page, 300, 720)
      await humanType(
        page,
        page.getByPlaceholder('What can we help with?'),
        'Need a different size for order #12345.',
      )
      await humanPause(page, 380, 880)
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect(page.getByRole('status')).toContainText(/Thanks—your note is recorded/i)
      await humanPause(page, 400, 950)
      await page.getByRole('button', { name: /exchange for a different size/i }).click()
      await expect(page.getByText(/start an exchange from the order email/i)).toBeVisible()

      page.once('dialog', (dialog) => {
        expect(dialog.message()).toContain('chat would open')
        void dialog.accept()
      })
      await humanPause(page, 330, 780)
      await page.getByRole('button', { name: 'Start live chat (demo)' }).click()
    })
  })
}

/** user-1: clean session (new visitor). user-2: synthetic “yesterday” events + same-day return. */
registerShoppersSuite('new', 'user-1')
registerShoppersSuite('returning', 'user-2')

registerTabJourneysSuite('new', 'user-1')
registerTabJourneysSuite('returning', 'user-2')

/**
 * Extra unique visitors for `hero_copy_test`: each gets a fresh Statsig stableID, hits the hero,
 * books a fitting call, and completes a purchase. Override count with `SIM_EXPERIMENT_USERS`.
 */
function experimentUserCount(): number {
  const n = Number(process.env.SIM_EXPERIMENT_USERS ?? 8)
  if (!Number.isFinite(n) || n < 1) {
    return 8
  }
  return Math.min(Math.floor(n), 24)
}

function registerExperimentTrafficSuite(): void {
  const count = experimentUserCount()

  test.describe.parallel(`hero_copy_test traffic (${count} users)`, () => {
    for (let index = 1; index <= count; index += 1) {
      const userLabel = `exp-user-${index}`
      const cohort: SimulatedCohort = index % 4 === 0 ? 'returning' : 'new'
      const variant = index % 3

      test(`${userLabel} (${cohort}): hero → fitting call → purchase`, async ({ page }) => {
        await primeUserSession(page, { cohort, userLabel })
        await page.goto('/')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await humanPause(page, 500, 1_200)

        // Ensure experiment exposure + primary CTA interaction before booking.
        if (variant === 0) {
          await heroPrimaryCta(page).click()
          await humanMicroPause(page, 280, 680)
          await expect(page.getByRole('searchbox')).toBeVisible()
          await page.getByRole('button', { name: 'Book a fitting call' }).scrollIntoViewIfNeeded()
          await humanPause(page, 350, 800)
        }

        await bookFittingCall(page, {
          name: `Experiment Shopper ${index}`,
          email: `exp.user.${index}@example.com`,
          notes:
            variant === 1
              ? 'Need sizing help for trail shoes and a mid-layer.'
              : 'Interested in a virtual fit check before ordering.',
        })

        if (variant !== 0) {
          await openHeroCatalog(page)
        }

        if (variant === 2) {
          await page.getByRole('button', { name: 'Apparel', exact: true }).click()
          await humanMicroPause(page)
          await page.getByLabel('Sort').selectOption('rating')
          await humanPause(page, 350, 820)
        } else if (variant === 1) {
          await page.getByRole('button', { name: 'Footwear', exact: true }).click()
          await humanMicroPause(page)
        }

        await page.getByRole('button', { name: 'Add to bag' }).first().click()
        await humanPause(page, 400, 950)
        if (variant !== 1) {
          const secondAdd = page.getByRole('button', { name: 'Add to bag' }).nth(1)
          if (await secondAdd.isVisible().catch(() => false)) {
            await secondAdd.click()
            await humanMicroPause(page)
          }
        }

        await expect(page.getByRole('button', { name: 'Continue to checkout' })).toBeEnabled()
        await completePurchase(page)
      })
    }
  })
}

registerExperimentTrafficSuite()
