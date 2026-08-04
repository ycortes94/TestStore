import { useEffect, useRef } from 'react'
import { getFreeShippingBreakdown } from '../lib/shipping'
import { useFreeShippingRules } from '../hooks/useFreeShippingRules'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'

type FreeShippingBannerProps = {
  subtotal: number
  hasItems: boolean
  source: 'cart_summary' | 'cart_modal' | 'checkout_modal'
}

const FreeShippingBanner = ({ subtotal, hasItems, source }: FreeShippingBannerProps) => {
  const rules = useFreeShippingRules()
  const breakdown = getFreeShippingBreakdown(subtotal, rules)
  const hasLoggedView = useRef(false)
  const hasLoggedUnlock = useRef(false)

  useEffect(() => {
    if (!hasItems) {
      hasLoggedView.current = false
      hasLoggedUnlock.current = false
      return
    }

    if (!hasLoggedView.current) {
      hasLoggedView.current = true
      trackEvent('free_shipping_banner_viewed', {
        subtotal,
        thresholdUsd: rules.thresholdUsd,
        unlocked: breakdown.unlocked,
        amountToUnlock: breakdown.amountToUnlock,
        source,
      })
      logStatsigEvent('free_shipping_banner_viewed', subtotal, {
        subtotal,
        thresholdUsd: rules.thresholdUsd,
        unlocked: breakdown.unlocked,
        amountToUnlock: breakdown.amountToUnlock,
        source,
      })
    }

    if (breakdown.unlocked && !hasLoggedUnlock.current) {
      hasLoggedUnlock.current = true
      trackEvent('free_shipping_unlocked', {
        subtotal,
        thresholdUsd: rules.thresholdUsd,
        source,
      })
      logStatsigEvent('free_shipping_unlocked', subtotal, {
        subtotal,
        thresholdUsd: rules.thresholdUsd,
        source,
      })
    }
  }, [
    breakdown.amountToUnlock,
    breakdown.unlocked,
    hasItems,
    rules.thresholdUsd,
    source,
    subtotal,
  ])

  if (!hasItems) {
    return null
  }

  const progress = Math.min(100, (subtotal / rules.thresholdUsd) * 100)

  return (
    <div
      className={
        breakdown.unlocked
          ? 'free-shipping-banner is-unlocked'
          : 'free-shipping-banner'
      }
      role="status"
    >
      <p className="eyebrow">{rules.bannerEyebrow}</p>
      <strong>{breakdown.message}</strong>
      <div className="free-shipping-banner__track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export default FreeShippingBanner
