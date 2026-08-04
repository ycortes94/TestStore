import { COUPON_PERCENT } from '../lib/coupon'
import type { CouponBreakdown } from '../lib/coupon'

type CouponPanelProps = {
  featureEnabled: boolean
  hasItems: boolean
  breakdown: CouponBreakdown
}

const CouponPanel = ({ featureEnabled, hasItems, breakdown }: CouponPanelProps) => {
  if (!featureEnabled || !hasItems) {
    return null
  }

  return (
    <div className={breakdown.eligible ? 'cart-summary__coupon is-unlocked' : 'cart-summary__coupon'} role="status">
      {breakdown.eligible ? (
        <>
          <p className="eyebrow">Coupon unlocked</p>
          <strong>{COUPON_PERCENT}% off applied</strong>
          <p className="muted">Nice — your bag qualifies for a {COUPON_PERCENT}% cart coupon.</p>
        </>
      ) : (
        <>
          <p className="eyebrow">Almost there</p>
          <strong>Unlock {COUPON_PERCENT}% off</strong>
          <p className="muted">Add ${breakdown.amountToUnlock.toFixed(2)} more to unlock a {COUPON_PERCENT}% coupon.</p>
        </>
      )}
    </div>
  )
}

export default CouponPanel
