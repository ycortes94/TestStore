import { useDynamicConfig } from '@statsig/react-bindings'
import {
  CART_PROMO_CONFIG,
  DEFAULT_CART_PROMO_RULES,
  type CartPromoRules,
} from '../lib/coupon'

/**
 * Reads `cart_promo_rules` Dynamic Config with typed fallbacks matching current store defaults.
 * Note: clients receive the matching **rule return value**. If no rule matches (or the config is
 * missing from initialize), these local fallbacks are used instead of the console Default Value.
 */
export const useCartPromoRules = (): CartPromoRules => {
  const config = useDynamicConfig(CART_PROMO_CONFIG)

  if (import.meta.env.DEV && config.details.reason.includes('Unrecognized')) {
    console.warn(
      '[Statsig] cart_promo_rules was not in the initialize payload; using local fallbacks.',
      config.details,
    )
  }

  const eligibleComparisonRaw = config.get(
    'eligible_comparison',
    DEFAULT_CART_PROMO_RULES.eligibleComparison,
  )
  const eligibleComparison =
    eligibleComparisonRaw === 'gte' || eligibleComparisonRaw === 'gt'
      ? eligibleComparisonRaw
      : DEFAULT_CART_PROMO_RULES.eligibleComparison

  return {
    thresholdUsd: config.get('threshold_usd', DEFAULT_CART_PROMO_RULES.thresholdUsd),
    discountPercent: config.get('discount_percent', DEFAULT_CART_PROMO_RULES.discountPercent),
    eligibleComparison,
    unlockEyebrow: config.get('unlock_eyebrow', DEFAULT_CART_PROMO_RULES.unlockEyebrow),
    appliedEyebrow: config.get('applied_eyebrow', DEFAULT_CART_PROMO_RULES.appliedEyebrow),
  }
}
