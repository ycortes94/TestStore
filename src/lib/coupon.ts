export const COUPON_GATE = 'show_cart_coupon_15'
export const CART_PROMO_CONFIG = 'cart_promo_rules'

/** Fallbacks when the Dynamic Config is missing or a key is unset. */
export const DEFAULT_CART_PROMO_RULES = {
  thresholdUsd: 400,
  discountPercent: 15,
  eligibleComparison: 'gt' as const,
  unlockEyebrow: 'Almost there',
  appliedEyebrow: 'Coupon unlocked',
}

export type CartPromoRules = {
  thresholdUsd: number
  discountPercent: number
  /** `gt` = subtotal must be strictly greater than threshold (current store behavior). */
  eligibleComparison: 'gt' | 'gte'
  unlockEyebrow: string
  appliedEyebrow: string
}

export type CouponBreakdown = {
  eligible: boolean
  discountAmount: number
  totalAfterDiscount: number
  amountToUnlock: number
  discountPercent: number
}

/** @deprecated Prefer DEFAULT_CART_PROMO_RULES.thresholdUsd via useCartPromoRules(). */
export const COUPON_THRESHOLD = DEFAULT_CART_PROMO_RULES.thresholdUsd
/** @deprecated Prefer rules.discountPercent via useCartPromoRules(). */
export const COUPON_PERCENT = DEFAULT_CART_PROMO_RULES.discountPercent

/** Coupon eligibility + discount from gate on/off plus remote promo rules. */
export const getCouponBreakdown = (
  subtotal: number,
  featureEnabled: boolean,
  rules: CartPromoRules = DEFAULT_CART_PROMO_RULES,
): CouponBreakdown => {
  const eligible =
    featureEnabled &&
    (rules.eligibleComparison === 'gte'
      ? subtotal >= rules.thresholdUsd
      : subtotal > rules.thresholdUsd)
  const discountAmount = eligible ? subtotal * (rules.discountPercent / 100) : 0
  const unlockFloor = rules.eligibleComparison === 'gte' ? rules.thresholdUsd : rules.thresholdUsd + 0.01
  return {
    eligible,
    discountAmount,
    totalAfterDiscount: subtotal - discountAmount,
    amountToUnlock: Math.max(0, unlockFloor - subtotal),
    discountPercent: rules.discountPercent,
  }
}
