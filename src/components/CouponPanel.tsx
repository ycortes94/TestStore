import type { CartPromoRules, CouponBreakdown } from '../lib/coupon'

type CouponPanelProps = {
  featureEnabled: boolean
  hasItems: boolean
  breakdown: CouponBreakdown
  rules: CartPromoRules
}

const CouponPanel = ({ featureEnabled, hasItems, breakdown, rules }: CouponPanelProps) => {
  if (!featureEnabled || !hasItems) {
    return null
  }

  return (
    <div className={breakdown.eligible ? 'cart-summary__coupon is-unlocked' : 'cart-summary__coupon'} role="status">
      {breakdown.eligible ? (
        <>
          <p className="eyebrow">{rules.appliedEyebrow}</p>
          <strong>{rules.discountPercent}% off applied</strong>
          <p className="muted">Nice — your bag qualifies for a {rules.discountPercent}% cart coupon.</p>
        </>
      ) : (
        <>
          <p className="eyebrow">{rules.unlockEyebrow}</p>
          <strong>Unlock {rules.discountPercent}% off</strong>
          <p className="muted">
            Add ${breakdown.amountToUnlock.toFixed(2)} more to pass ${rules.thresholdUsd.toFixed(0)} and unlock a{' '}
            {rules.discountPercent}% coupon.
          </p>
        </>
      )}
    </div>
  )
}

export default CouponPanel
