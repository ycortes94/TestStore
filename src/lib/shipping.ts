export const FREE_SHIPPING_CONFIG = 'free_shipping_rules'
export const LOW_STOCK_GATE = 'show_low_stock_urgency'
export const NEWSLETTER_GATE = 'show_newsletter_modal'
export const PDP_RECS_EXPERIMENT = 'pdp_recs_test'
export const CHECKOUT_SHIPPING_EXPERIMENT = 'checkout_shipping_test'

export const LOW_STOCK_THRESHOLD = 5
export const STANDARD_SHIPPING_USD = 8
export const DEFAULT_EXPRESS_SHIPPING_USD = 12
export const MAX_EXPRESS_SHIPPING_USD = 50

/** Clamp caller-supplied express price; fall back when missing/invalid. */
export const sanitizeExpressShippingUsd = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return DEFAULT_EXPRESS_SHIPPING_USD
  }
  return Math.min(MAX_EXPRESS_SHIPPING_USD, Math.max(0, numeric))
}

export const sanitizeShippingMethod = (value: unknown): 'standard' | 'express' =>
  value === 'express' ? 'express' : 'standard'

export const DEFAULT_FREE_SHIPPING_RULES = {
  thresholdUsd: 150,
  messageLocked: "You're ${{amount}} away from free shipping",
  messageUnlocked: "You've unlocked free shipping",
  bannerEyebrow: 'Shipping',
}

export type FreeShippingRules = {
  thresholdUsd: number
  messageLocked: string
  messageUnlocked: string
  bannerEyebrow: string
}

export type FreeShippingBreakdown = {
  unlocked: boolean
  amountToUnlock: number
  message: string
}

export const formatShippingMessage = (template: string, amount: number): string =>
  template.replace('${{amount}}', `$${amount.toFixed(2)}`)

export const getFreeShippingBreakdown = (
  subtotal: number,
  rules: FreeShippingRules = DEFAULT_FREE_SHIPPING_RULES,
): FreeShippingBreakdown => {
  const amountToUnlock = Math.max(0, rules.thresholdUsd - subtotal)
  const unlocked = amountToUnlock <= 0
  return {
    unlocked,
    amountToUnlock,
    message: unlocked
      ? rules.messageUnlocked
      : formatShippingMessage(rules.messageLocked, amountToUnlock),
  }
}

export const getRecommendedProducts = <T extends { id: string; category: string; tags: string[] }>(
  product: T,
  catalog: T[],
  limit = 4,
): T[] => {
  const scored = catalog
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => {
      const sameCategory = candidate.category === product.category ? 2 : 0
      const sharedTags = candidate.tags.filter((tag) => product.tags.includes(tag)).length
      return { candidate, score: sameCategory + sharedTags }
    })
    .sort((a, b) => b.score - a.score || a.candidate.id.localeCompare(b.candidate.id))

  return scored.slice(0, limit).map((entry) => entry.candidate)
}
