import { useGateValue } from '@statsig/react-bindings'
import CouponPanel from './CouponPanel'
import { COUPON_GATE, COUPON_PERCENT, getCouponBreakdown } from '../lib/coupon'

type CheckoutLine = { id: string; name: string; quantity: number; lineTotal: number }

type CheckoutModalProps = {
  open: boolean
  itemLines: CheckoutLine[]
  total: number
  purchaseComplete: boolean
  purchasedTotal: number
  onDismiss: () => void
  onConfirmPurchase: () => void
}

const CheckoutModal = ({
  open,
  itemLines,
  total,
  purchaseComplete,
  purchasedTotal,
  onDismiss,
  onConfirmPurchase,
}: CheckoutModalProps) => {
  const couponFeatureEnabled = useGateValue(COUPON_GATE)
  const coupon = getCouponBreakdown(total, couponFeatureEnabled)

  if (!open) {
    return null
  }

  const itemCount = itemLines.reduce((sum, line) => sum + line.quantity, 0)
  const payableTotal = coupon.eligible ? coupon.totalAfterDiscount : total

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {purchaseComplete ? (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Order placed</p>
              <h2 id="checkout-modal-title">Thanks — your order is in</h2>
              <p className="muted">We&apos;ll send a confirmation shortly. Your total was ${purchasedTotal.toFixed(2)}.</p>
            </header>
            <div className="checkout-modal__actions">
              <button className="primary full-width" type="button" onClick={onDismiss}>
                Back to shopping
              </button>
            </div>
          </>
        ) : (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Checkout</p>
              <h2 id="checkout-modal-title">Review your order</h2>
              <p className="muted">
                {itemCount} items · ${total.toFixed(2)} before discounts
              </p>
            </header>

            <ul className="checkout-modal__lines">
              {itemLines.map((line) => (
                <li key={line.id}>
                  <span>
                    <strong>{line.name}</strong>
                    <span className="muted">{` × ${line.quantity}`}</span>
                  </span>
                  <span>${line.lineTotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <CouponPanel featureEnabled={couponFeatureEnabled} hasItems={itemLines.length > 0} breakdown={coupon} />

            <div className="cart-summary__totals checkout-modal__totals">
              <div className="cart-summary__total">
                <span>Subtotal</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {coupon.eligible && (
                <>
                  <div className="cart-summary__total cart-summary__total--discount">
                    <span>Coupon ({COUPON_PERCENT}% off)</span>
                    <strong>−${coupon.discountAmount.toFixed(2)}</strong>
                  </div>
                  <div className="cart-summary__total">
                    <span>Total</span>
                    <strong>${payableTotal.toFixed(2)}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="checkout-modal__actions">
              <button className="secondary full-width" type="button" onClick={onDismiss}>
                Keep shopping
              </button>
              <button className="primary full-width" type="button" onClick={onConfirmPurchase}>
                Place order · ${payableTotal.toFixed(2)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CheckoutModal
