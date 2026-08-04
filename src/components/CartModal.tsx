import { useGateValue } from '@statsig/react-bindings'
import CouponPanel from './CouponPanel'
import { COUPON_GATE, COUPON_PERCENT, getCouponBreakdown } from '../lib/coupon'
import type { CartItem } from '../types'

type CartModalProps = {
  open: boolean
  items: CartItem[]
  total: number
  purchaseComplete: boolean
  purchasedTotal: number
  onDismiss: () => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onClear: () => void
  onConfirmPurchase: () => void
}

const CartModal = ({
  open,
  items,
  total,
  purchaseComplete,
  purchasedTotal,
  onDismiss,
  onIncrement,
  onDecrement,
  onClear,
  onConfirmPurchase,
}: CartModalProps) => {
  const couponFeatureEnabled = useGateValue(COUPON_GATE)
  const coupon = getCouponBreakdown(total, couponFeatureEnabled)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (!open) {
    return null
  }

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="checkout-modal cart-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {purchaseComplete ? (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Order placed</p>
              <h2 id="cart-modal-title">Thanks — your order is in</h2>
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
            <header className="checkout-modal__header cart-modal__header">
              <div>
                <p className="eyebrow">Your bag</p>
                <h2 id="cart-modal-title">Cart details</h2>
                <p className="muted">
                  {itemCount === 0 ? 'Your bag is empty.' : `${itemCount} items · $${total.toFixed(2)} before discounts`}
                </p>
              </div>
              <button className="text-button" type="button" onClick={onClear} disabled={!items.length}>
                Clear
              </button>
            </header>

            {items.length === 0 ? (
              <p className="muted">Add a few products, then open your bag to check out.</p>
            ) : (
              <ul className="cart-summary__list cart-modal__list">
                {items.map(({ product, quantity }) => (
                  <li key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{`$${product.price} · ${product.collections[0]}`}</span>
                      <span className="cart-modal__line-total">${(product.price * quantity).toFixed(2)}</span>
                    </div>
                    <div className="cart-summary__quantity">
                      <button
                        type="button"
                        onClick={() => onDecrement(product.id)}
                        aria-label={`Remove one ${product.name}`}
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={() => onIncrement(product.id)}
                        aria-label={`Add one ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <CouponPanel featureEnabled={couponFeatureEnabled} hasItems={items.length > 0} breakdown={coupon} />

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
                    <strong>${coupon.totalAfterDiscount.toFixed(2)}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="checkout-modal__actions">
              <button className="secondary full-width" type="button" onClick={onDismiss}>
                Keep shopping
              </button>
              <button
                className="primary full-width"
                type="button"
                disabled={!items.length}
                onClick={onConfirmPurchase}
              >
                Place order
                {items.length > 0
                  ? ` · $${(coupon.eligible ? coupon.totalAfterDiscount : total).toFixed(2)}`
                  : ''}
              </button>
            </div>
            <p className="microcopy">Free returns within 60 days. Taxes calculated at checkout.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default CartModal
