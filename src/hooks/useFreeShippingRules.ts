import { useDynamicConfig } from '@statsig/react-bindings'
import {
  DEFAULT_FREE_SHIPPING_RULES,
  FREE_SHIPPING_CONFIG,
  type FreeShippingRules,
} from '../lib/shipping'

/** Reads `free_shipping_rules` Dynamic Config (Everyone rule return values). */
export const useFreeShippingRules = (): FreeShippingRules => {
  const config = useDynamicConfig(FREE_SHIPPING_CONFIG)

  if (import.meta.env.DEV && config.details.reason.includes('Unrecognized')) {
    console.warn(
      '[Statsig] free_shipping_rules was not in the initialize payload; using local fallbacks.',
      config.details,
    )
  }

  return {
    thresholdUsd: config.get('threshold_usd', DEFAULT_FREE_SHIPPING_RULES.thresholdUsd),
    messageLocked: config.get('message_locked', DEFAULT_FREE_SHIPPING_RULES.messageLocked),
    messageUnlocked: config.get('message_unlocked', DEFAULT_FREE_SHIPPING_RULES.messageUnlocked),
    bannerEyebrow: config.get('banner_eyebrow', DEFAULT_FREE_SHIPPING_RULES.bannerEyebrow),
  }
}
