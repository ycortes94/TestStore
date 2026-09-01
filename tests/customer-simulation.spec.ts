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
 * When `SIM_HUMAN_MIN_MS` / `SIM_HUMAN_MAX_MS` are set (CI), those bounds win over per-call args.
 */
async function humanPause(page: Page, minMs?: number, maxMs?: number): Promise<void> {
  const min =
    process.env.SIM_HUMAN_MIN_MS !== undefined
      ? envMs('SIM_HUMAN_MIN_MS', 600)
      : (minMs ?? 600)
  const max =
    process.env.SIM_HUMAN_MAX_MS !== undefined
      ? envMs('SIM_HUMAN_MAX_MS', 1_450)
      : (maxMs ?? 1_450)
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
  await humanMicroPause(page, 80, 200)
  // Under PLAYWRIGHT_SLOW_MO each keystroke also pays slowMo; keep delays short so long
  // forms (fitting-call notes) do not burn the experiment-suite budget alone.
  const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0)
  const delay =
    slowMo > 0
      ? randInt(18, 40)
      : text.length > 24
        ? randInt(28, 55)
        : randInt(45, 95)
  await locator.pressSequentially(text, { delay })
}

type HomepageVariant = 'control' | 'runway' | 'studio'

async function detectHomepageVariant(page: Page): Promise<HomepageVariant> {
  // Wait for a homepage root, otherwise a check that races React render reads as Control.
  await expect(page.locator('.control-home, .runway-home, .studio-home').first()).toBeVisible()

  if (await page.locator('.runway-home').first().isVisible().catch(() => false)) {
    return 'runway'
  }
  if (await page.locator('.studio-home').first().isVisible().catch(() => false)) {
    return 'studio'
  }
  return 'control'
}

async function openCatalog(page: Page): Promise<void> {
  await page.goto('/')
  await openHeroCatalog(page)
}

/**
 * Shop / browse CTA across homepage_revamp_test arms:
 * Control — Explore the edit | Shop new arrivals (legacy hero_copy_test copy)
 * Runway — Shop the runway
 * Studio — Or explore the edit
 */
function shopCta(page: Page): Locator {
  return page.getByRole('button', {
    name: /Explore the edit|Shop new arrivals|Shop the runway|Or explore the edit/i,
  })
}

/** @deprecated Prefer shopCta — kept for readability at call sites that mean "primary shop". */
function heroPrimaryCta(page: Page): Locator {
  return shopCta(page)
}

/** Use when the page is already on a shopping tab (do not call `page.goto` first). */
async function openHeroCatalog(page: Page): Promise<void> {
  await shopCta(page).click()
  await humanMicroPause(page, 280, 680)
  await expect(page.getByRole('searchbox')).toBeVisible()
}

async function goToTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('tab', { name: tabName }).click()
  await humanPause(page, 400, 920)
}

/**
 * Completes the Book a fitting call modal (Statsig `fitting_call_scheduled`).
 * Returns false on Runway (no fitting CTA) so callers can continue the shop journey.
 */
async function bookFittingCall(
  page: Page,
  persona: { name: string; email: string; notes?: string },
): Promise<boolean> {
  const bookBtn = page.getByRole('button', { name: 'Book a fitting call' })
  if (!(await bookBtn.isVisible().catch(() => false))) {
    return false
  }

  await bookBtn.click()
  const dialog = page.getByRole('dialog', { name: /Book a fitting call/i })
  await expect(dialog).toBeVisible()
  await humanMicroPause(page, 200, 450)

  await humanType(page, dialog.getByLabel('Name'), persona.name)
  await humanMicroPause(page, 120, 280)
  // Email / notes: fill is fine for Pulse and avoids slowMo × keystroke blowups.
  await dialog.getByLabel('Email').fill(persona.email)
  await humanMicroPause(page, 120, 280)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const preferredDate = tomorrow.toISOString().slice(0, 10)
  await dialog.getByLabel('Preferred date').fill(preferredDate)
  await humanMicroPause(page, 100, 220)

  const timeSlots = ['09:00', '11:00', '13:00', '15:00', '17:00'] as const
  await dialog.getByLabel('Time').selectOption(timeSlots[randInt(0, timeSlots.length - 1)])
  await humanMicroPause(page, 100, 220)

  if (persona.notes) {
    await dialog.getByLabel(/Notes/i).fill(persona.notes)
    await humanMicroPause(page, 120, 280)
  }

  await dialog.getByRole('button', { name: 'Schedule fitting call' }).click()
  await expect(page.getByRole('heading', { name: /You.?re on the calendar/i })).toBeVisible()
  await humanPause(page, 350, 750)
  await page.getByRole('button', { name: 'Back to shopping' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await humanMicroPause(page, 200, 450)
  await flushStatsig(page)
  return true
}

/**
 * Cart controls live in the sidebar on Control/Studio; Runway hides it, so fall back to the
 * header bag modal (same Add one / Remove one / Clear affordances).
 */
async function withCartControls<T>(page: Page, fn: (scope: Locator) => Promise<T>): Promise<T> {
  const sidebar = page.locator('.cart-summary').first()
  if (await sidebar.isVisible().catch(() => false)) {
    return fn(sidebar)
  }

  await page.getByRole('button', { name: /Open bag/i }).click()
  const bag = page.getByRole('dialog', { name: /Cart details/i })
  await expect(bag).toBeVisible()
  const result = await fn(bag)
  await page.keyboard.press('Escape')
  await expect(bag).toHaveCount(0)
  await humanMicroPause(page, 200, 450)
  return result
}

/** True when the bag has at least one item, regardless of homepage variant. */
async function cartHasItems(page: Page): Promise<boolean> {
  const chip = page.getByRole('button', { name: /Open bag/i })
  const label = (await chip.getAttribute('aria-label').catch(() => null)) ?? ''
  const match = /Open bag,\s*(\d+)/i.exec(label)
  return match ? Number(match[1]) > 0 : false
}

/** Checkout affordance across variants: sidebar button or Runway sticky bag bar. */
function checkoutAffordance(page: Page): Locator {
  return page
    .getByRole('button', { name: 'Continue to checkout' })
    .or(page.locator('.runway-bag-bar').getByRole('button', { name: 'Checkout' }))
    .first()
}

/** Opens checkout from the cart sidebar, Runway bag bar, or header bag modal. */
async function beginCheckout(page: Page): Promise<void> {
  const continueToCheckout = page.getByRole('button', { name: 'Continue to checkout' })
  if (await continueToCheckout.isVisible().catch(() => false)) {
    await continueToCheckout.click()
    return
  }

  const runwayCheckout = page.locator('.runway-bag-bar').getByRole('button', { name: 'Checkout' })
  if (await runwayCheckout.isVisible().catch(() => false)) {
    await runwayCheckout.click()
    return
  }

  await page.getByRole('button', { name: /Open bag/i }).click()
  const bag = page.getByRole('dialog', { name: /Cart details/i })
  await expect(bag).toBeVisible()
  await bag.getByRole('button', { name: /Continue to checkout/i }).click()
}

/** Fills bag, runs checkout through Place order, closes thank-you modal. */
async function completePurchase(
  page: Page,
  options?: { shipping?: 'standard' | 'express' },
): Promise<void> {
  const shipping = options?.shipping ?? (Math.random() < 0.45 ? 'express' : 'standard')
  await humanMicroPause(page, 200, 450)
  await beginCheckout(page)
  const review = page.getByRole('dialog', { name: /Review your order/i })
  await expect(review).toBeVisible()
  await humanPause(page, 300, 700)

  // Expose free_shipping_rules + checkout_shipping_test (express upsell).
  await expect(review.locator('.free-shipping-banner').or(review.getByText(/Shipping/i)).first()).toBeVisible()
  if (shipping === 'express') {
    await review.getByRole('radio', { name: /Express/i }).check()
    await humanMicroPause(page, 150, 350)
  } else {
    await review.getByRole('radio', { name: /Standard/i }).check()
    await humanMicroPause(page, 120, 280)
  }

  await humanMicroPause(page, 200, 450)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByRole('heading', { name: /Thanks — your order is in/i })).toBeVisible()
  await humanPause(page, 350, 750)
  await page.getByRole('button', { name: 'Back to shopping' }).click()
  await expect(page.getByRole('dialog', { name: /Thanks|Review your order|Cart details/i })).toHaveCount(0)
  await humanMicroPause(page, 200, 450)
  await flushStatsig(page)
}

/** Opens a PDP (recs experiment exposure) and optionally adds from the detail page. */
async function browseProductDetail(
  page: Page,
  productName: string,
  options?: { addToBag?: boolean; clickRec?: boolean },
): Promise<void> {
  const card = page.locator('article.product-card').filter({ hasText: productName }).first()
  await expect(card).toBeVisible()
  await card.getByRole('link', { name: new RegExp(productName, 'i') }).first().click()
  await expect(page).toHaveURL(/\/product\//)
  await humanPause(page, 500, 1_100)

  // pdp_recs_test + low-stock urgency (when applicable) evaluate on this page.
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(productName, 'i') })).toBeVisible()
  const recs = page.locator('.pdp-recs')
  if (await recs.isVisible().catch(() => false)) {
    await expect(recs.getByRole('heading', { level: 2 })).toBeVisible()
    if (options?.clickRec) {
      await recs.locator('a.pdp-recs__card').first().click()
      await humanPause(page, 400, 900)
      await expect(page).toHaveURL(/\/product\//)
    }
  }

  if (options?.addToBag) {
    const add = page.getByRole('button', { name: 'Add to bag' })
    if (await add.isEnabled().catch(() => false)) {
      await add.click()
      await humanMicroPause(page)
    }
  }

  await flushStatsig(page)
}

/** Out-of-stock waitlist flow (notify_me_* events). */
async function submitNotifyMe(page: Page, email: string): Promise<void> {
  await page.getByRole('button', { name: 'Notify me' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Notify me/i })
  await expect(dialog).toBeVisible()
  await humanPause(page, 350, 800)
  await humanType(page, dialog.getByLabel('Email'), email)
  await dialog.getByRole('button', { name: 'Notify me' }).click()
  await expect(page.getByRole('heading', { name: /We.?ll ping you when it.?s back/i })).toBeVisible()
  await humanMicroPause(page)
  await page.getByRole('button', { name: 'Continue shopping' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await flushStatsig(page)
}

/** Newsletter gate — force via query param so Playwright is reliable. */
async function completeNewsletterSignup(page: Page, email: string): Promise<void> {
  await page.goto('/?newsletter=1')
  const dialog = page.getByRole('dialog', { name: /Get first dibs on new drops/i })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  await humanPause(page, 350, 800)
  await humanType(page, dialog.getByLabel('Email'), email)
  await dialog.getByRole('button', { name: 'Subscribe' }).click()
  await expect(page.getByRole('heading', { name: /Thanks for joining the list/i })).toBeVisible()
  await humanMicroPause(page)
  await page.getByRole('button', { name: 'Continue shopping' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await flushStatsig(page)
}

/** Build a cart large enough to unlock free shipping ($150) and optionally the coupon ($400). */
async function fillCartForPromoThresholds(
  page: Page,
  mode: 'free_shipping' | 'coupon',
): Promise<void> {
  await openCatalog(page)
  // High-ticket pieces: Summit Shell $210, Running Essentials $189, Studio Wrap $168
  const targets =
    mode === 'coupon'
      ? ['Summit Packable Shell', 'Running Essentials Kit', 'Studio Wrap Jacket']
      : ['Running Essentials Kit']

  for (const name of targets) {
    const card = page.locator('article.product-card').filter({ hasText: name }).first()
    if (!(await card.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'All', exact: true }).click()
      await humanMicroPause(page)
    }
    await page.locator('article.product-card').filter({ hasText: name }).getByRole('button', { name: 'Add to bag' }).click()
    await humanPause(page, 350, 750)
  }

  if (mode === 'coupon') {
    // Push over $400 coupon threshold (config cart_promo_rules).
    await page.locator('article.product-card').filter({ hasText: 'City Trail Sneaker' }).getByRole('button', { name: 'Add to bag' }).click()
    await humanMicroPause(page)
  }

  await expect(page.locator('.free-shipping-banner').or(page.locator('.runway-bag-bar'))).toBeVisible()
  if (mode === 'coupon') {
    await withCartControls(page, async (scope) => {
      await expect(scope.locator('.cart-summary__coupon, .free-shipping-banner').first()).toBeVisible()
    })
  }
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
      await withCartControls(page, async (scope) => {
        const increment = scope.getByRole('button', { name: /Add one /i }).first()
        if (await increment.isVisible().catch(() => false)) {
          await increment.click()
          await humanMicroPause(page)
        }
      })

      await expect(checkoutAffordance(page)).toBeEnabled()
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
      await expect(checkoutAffordance(page)).toBeEnabled()
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
      await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded()
      await humanMicroPause(page)
      await bookFittingCall(page, {
        name: `${userLabel} Shopper`,
        email: `${userLabel.replace(/\W+/g, '-')}@example.com`,
        notes: 'Looking for breathable layers for morning runs.',
      })
      await openHeroCatalog(page)

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
      await expect(checkoutAffordance(page)).toBeEnabled()
      await humanPause(page, 540, 1180)
      await beginCheckout(page)
      const review = page.getByRole('dialog', { name: /Review your order/i })
      await expect(review).toBeVisible()
      await humanPause(page, 470, 1080)
      await expect(review.getByText('Running Essentials Kit')).toBeVisible()
      await expect(review.getByText('City Trail Sneaker')).toBeVisible()
      await humanPause(page, 400, 900)
      await review.getByRole('radio', { name: /Express/i }).check()
      await humanPause(page, 400, 900)
      await page.getByRole('button', { name: 'Place order' }).click()
      await expect(page.getByRole('heading', { name: /Thanks — your order is in/i })).toBeVisible()
      await humanMicroPause(page)
      await page.getByRole('button', { name: 'Back to shopping' }).click()
      await flushStatsig(page)
    })

    test('in-stock purist toggles filter and abandons checkout once', async ({ page }) => {
      await openCatalog(page)
      await page.getByRole('checkbox', { name: /only show in-stock/i }).check()
      await humanPause(page, 380, 880)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await humanPause(page, 430, 960)
      await beginCheckout(page)
      await expect(page.getByRole('dialog', { name: /Review your order/i })).toBeVisible()
      await humanPause(page, 540, 1180)
      await page.getByRole('button', { name: 'Keep shopping' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await humanPause(page, 470, 1080)
      await beginCheckout(page)
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
 * Extra unique visitors for `homepage_revamp_test`: each gets a Statsig stableID (fresh for
 * new users; deterministic reused IDs for returning), hits the assigned homepage, and completes
 * a purchase. `SIM_EXPERIMENT_USERS` (default 100) is **per Playwright project**
 * (desktop / android / ios), so a full run is ~300 experiment visitors.
 * Variants also exercise PDP recs, express shipping, and promo thresholds when on Control/Studio.
 */
function experimentUserCount(): number {
  const n = Number(process.env.SIM_EXPERIMENT_USERS ?? 100)
  if (!Number.isFinite(n) || n < 1) {
    return 100
  }
  return Math.min(Math.floor(n), 200)
}

function registerExperimentTrafficSuite(): void {
  const count = experimentUserCount()

  test.describe.parallel(`homepage_revamp_test traffic (${count} users per platform)`, () => {
    // Fitting + PDP + checkout under slowMo can exceed 120s when the machine is busy;
    // keep headroom so flaky timeouts do not burn retries on otherwise healthy journeys.
    test.describe.configure({ timeout: 180_000 })

    for (let index = 1; index <= count; index += 1) {
      const userLabel = `exp-user-${index}`
      // ~25% returning with a stable Statsig unit reused across daily runs.
      const cohort: SimulatedCohort = index % 4 === 0 ? 'returning' : 'new'
      const journey = index % 3

      test(`${userLabel} (${cohort}): homepage → purchase`, async ({ page }) => {
        await primeUserSession(page, { cohort, userLabel })
        await page.goto('/')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await humanPause(page, 350, 800)

        const homepage = await detectHomepageVariant(page)

        if (homepage === 'control') {
          await expect(page.locator('.platform-promo-banner')).toBeVisible()
        }

        // Variant-native first action so each arm gets realistic exposure + engagement.
        if (homepage === 'studio') {
          await bookFittingCall(page, {
            name: `Experiment Shopper ${index}`,
            email: `exp.user.${index}@example.com`,
            notes:
              journey === 1
                ? 'Need sizing help for trail shoes and a mid-layer.'
                : 'Interested in a virtual fit check before ordering.',
          })
          await openHeroCatalog(page)
        } else if (homepage === 'runway') {
          await openHeroCatalog(page)
          const featuredAdd = page.locator('.runway-featured__add').first()
          if (await featuredAdd.isEnabled().catch(() => false)) {
            await featuredAdd.click()
            await humanMicroPause(page, 150, 350)
          }
        } else if (journey === 0) {
          await heroPrimaryCta(page).click()
          await humanMicroPause(page, 200, 450)
          await expect(page.getByRole('searchbox')).toBeVisible()
          const bookBtn = page.getByRole('button', { name: 'Book a fitting call' })
          if (await bookBtn.isVisible().catch(() => false)) {
            await bookBtn.scrollIntoViewIfNeeded()
            await humanMicroPause(page, 150, 350)
            await bookFittingCall(page, {
              name: `Experiment Shopper ${index}`,
              email: `exp.user.${index}@example.com`,
              notes: 'Interested in a virtual fit check before ordering.',
            })
          }
        } else {
          await bookFittingCall(page, {
            name: `Experiment Shopper ${index}`,
            email: `exp.user.${index}@example.com`,
            notes:
              journey === 1
                ? 'Need sizing help for trail shoes and a mid-layer.'
                : 'Interested in a virtual fit check before ordering.',
          })
          await openHeroCatalog(page)
        }

        if (journey === 2) {
          await page.getByRole('button', { name: 'Apparel', exact: true }).click()
          await humanMicroPause(page, 150, 350)
          await page.getByLabel('Sort').selectOption('rating')
          await humanMicroPause(page, 200, 450)
          await browseProductDetail(page, 'Studio Wrap Jacket', { addToBag: true, clickRec: true })
          await page.goto('/')
          await openHeroCatalog(page)
        } else if (journey === 1 && homepage !== 'runway') {
          await page.getByRole('button', { name: 'Footwear', exact: true }).click()
          await humanMicroPause(page, 150, 350)
          await browseProductDetail(page, 'City Trail Sneaker', { addToBag: true })
          await page.goto('/')
          await openHeroCatalog(page)
          await page.getByRole('button', { name: 'Footwear', exact: true }).click()
        }

        await page.getByRole('button', { name: 'Add to bag' }).first().click()
        await humanPause(page, 280, 650)
        if (journey !== 1) {
          const secondAdd = page.getByRole('button', { name: 'Add to bag' }).nth(1)
          if (await secondAdd.isVisible().catch(() => false)) {
            await secondAdd.click()
            await humanMicroPause(page, 150, 350)
          }
        }

        await completePurchase(page, { shipping: journey === 0 ? 'express' : 'standard' })
      })
    }
  })
}

/**
 * Focused journeys that deliberately hit every Statsig gate / experiment / dynamic config.
 */
function registerStatsigSurfacesSuite(): void {
  test.describe.parallel('Statsig surfaces coverage', () => {
    test.describe.configure({ timeout: 90_000 })

    test('gates+configs: coupon unlock, free shipping, newsletter, notify me, profile', async ({
      page,
    }) => {
      await primeUserSession(page, { cohort: 'new', userLabel: 'statsig-promo-user' })

      // Newsletter gate show_newsletter_modal (+ subscribe events)
      await completeNewsletterSignup(page, 'statsig.promo@example.com')

      // Platform banner config + homepage experiment exposure (banner is Control-only chrome)
      await page.goto('/')
      if ((await detectHomepageVariant(page)) === 'control') {
        await expect(page.locator('.platform-promo-banner')).toBeVisible()
      }
      await openHeroCatalog(page)

      // Low-stock gate: Studio Wrap (stock 4) shows urgency when gate passes
      await page.getByRole('button', { name: 'Apparel', exact: true }).click()
      await humanMicroPause(page)
      const wrap = page.locator('article.product-card').filter({ hasText: 'Studio Wrap Jacket' })
      await expect(wrap.getByText(/Only \d+ left|in stock/i)).toBeVisible()

      // Notify-me path for OOS (Lumos Trainer)
      await page.getByRole('button', { name: 'Footwear', exact: true }).click()
      await humanPause(page, 350, 800)
      await page.locator('article.product-card').filter({ hasText: 'Lumos Trainer' }).getByRole('link').first().click()
      await expect(page).toHaveURL(/lumos-trainer/)
      await submitNotifyMe(page, 'backinstock@example.com')
      await page.goto('/')
      await openHeroCatalog(page)

      // free_shipping_rules + cart_promo_rules + show_cart_coupon_15
      await fillCartForPromoThresholds(page, 'coupon')
      await withCartControls(page, async (scope) => {
        await expect(scope.getByText(/off applied|Coupon unlocked|Almost there/i).first()).toBeVisible()
      })
      await completePurchase(page, { shipping: 'express' })

      // Profile / order history (device-local)
      await page.getByRole('button', { name: /This device profile/i }).click()
      await expect(page).toHaveURL(/\/profile/)
      await expect(page.getByRole('heading', { name: /Shopper|Guest/i })).toBeVisible()
      await expect(page.getByText(/order|Completed purchases/i).first()).toBeVisible()
      await flushStatsig(page)
    })

    test('experiments: PDP recs + express shipping upsell', async ({ page }) => {
      await primeUserSession(page, { cohort: 'new', userLabel: 'statsig-exp-user' })
      await page.goto('/')
      await openHeroCatalog(page)

      await browseProductDetail(page, 'Running Essentials Kit', { addToBag: true, clickRec: true })
      // After clicking a rec we may be on another PDP — add that too if possible
      const addOnPdp = page.getByRole('button', { name: 'Add to bag' })
      if (await addOnPdp.isEnabled().catch(() => false)) {
        await addOnPdp.click()
        await humanMicroPause(page)
      }

      await page.goto('/')
      await openHeroCatalog(page)
      // Ensure free-shipping banner evaluates with items already in bag from PDP
      if (!(await cartHasItems(page))) {
        await page.getByRole('button', { name: 'Add to bag' }).first().click()
        await humanMicroPause(page)
      }
      await expect(page.locator('.free-shipping-banner').or(page.locator('.runway-bag-bar'))).toBeVisible()
      await completePurchase(page, { shipping: 'express' })
    })

    test('cart persistence + bag checkout path still lands in shipping experiment', async ({ page }) => {
      await primeUserSession(page, { cohort: 'returning', userLabel: 'statsig-persist-user' })
      await openCatalog(page)
      await page.getByRole('button', { name: 'Add to bag' }).first().click()
      await humanPause(page, 300, 700)
      await page.reload()
      await humanPause(page, 500, 1_000)
      await openHeroCatalog(page)
      const bagChip = page.getByRole('button', { name: /Open bag/i })
      await expect(bagChip).toContainText(/[1-9]/)
      await bagChip.click()
      const bag = page.getByRole('dialog', { name: /Cart details/i })
      await expect(bag).toBeVisible()
      await bag.getByRole('button', { name: /Continue to checkout/i }).click()
      const review = page.getByRole('dialog', { name: /Review your order/i })
      await expect(review).toBeVisible()
      await review.getByRole('radio', { name: /Standard/i }).check()
      await page.getByRole('button', { name: 'Place order' }).click()
      await expect(page.getByRole('heading', { name: /Thanks — your order is in/i })).toBeVisible()
      await page.getByRole('button', { name: 'Back to shopping' }).click()
      await flushStatsig(page)
    })
  })
}

registerExperimentTrafficSuite()
registerStatsigSurfacesSuite()
