import { useCallback } from 'react'
import { useGateValue } from '@statsig/react-bindings'
import CouponPanel from './CouponPanel'
import FreeShippingBanner from './FreeShippingBanner'
import { useCartPromoRules } from '../hooks/useCartPromoRules'
import { useFreeShippingRules } from '../hooks/useFreeShippingRules'
import { useModalA11y } from '../hooks/useModalA11y'
import { COUPON_GATE, getCouponBreakdown } from '../lib/coupon'
import { STANDARD_SHIPPING_USD, getFreeShippingBreakdown } from '../lib/shipping'
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
  /** Routes to full checkout so shipping is selected and totals stay honest. */
  onBeginCheckout: () => void
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
  onBeginCheckout,
}: CartModalProps) => {
  const couponFeatureEnabled = useGateValue(COUPON_GATE)
  const promoRules = useCartPromoRules()
  const freeShippingRules = useFreeShippingRules()
  const coupon = getCouponBreakdown(total, couponFeatureEnabled, promoRules)
  const freeShipping = getFreeShippingBreakdown(total, freeShippingRules)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const estimatedShipping = freeShipping.unlocked ? 0 : STANDARD_SHIPPING_USD
  const merchandiseTotal = coupon.eligible ? coupon.totalAfterDiscount : total
  const estimatedTotal = merchandiseTotal + estimatedShipping

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  useModalA11y(open, handleDismiss)

  if (!open) {
    return null
  }

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={handleDismiss}>
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
              <button className="primary full-width" type="button" data-autofocus onClick={handleDismiss}>
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

            <FreeShippingBanner subtotal={total} hasItems={items.length > 0} source="cart_modal" />

            {items.length === 0 ? (
              <p className="muted">Add a few products, then open your bag to check out.</p>
            ) : (
              <ul className="cart-summary__list cart-modal__list">
                {items.map(({ product, quantity }) => {
                  const atStock = product.stock > 0 && quantity >= product.stock
                  return (
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
                          disabled={atStock || product.stock === 0}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <CouponPanel
              featureEnabled={couponFeatureEnabled}
              hasItems={items.length > 0}
              breakdown={coupon}
              rules={promoRules}
            />

            <div className="cart-summary__totals checkout-modal__totals">
              <div className="cart-summary__total">
                <span>Subtotal</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {coupon.eligible && (
                <div className="cart-summary__total cart-summary__total--discount">
                  <span>Coupon ({promoRules.discountPercent}% off)</span>
                  <strong>−${coupon.discountAmount.toFixed(2)}</strong>
                </div>
              )}
              {items.length > 0 && (
                <div className="cart-summary__total">
                  <span>Est. standard shipping</span>
                  <strong>{estimatedShipping === 0 ? 'Free' : `$${estimatedShipping.toFixed(2)}`}</strong>
                </div>
              )}
              {items.length > 0 && (
                <div className="cart-summary__total">
                  <span>Est. total</span>
                  <strong>${estimatedTotal.toFixed(2)}</strong>
                </div>
              )}
            </div>

            <div className="checkout-modal__actions">
              <button className="secondary full-width" type="button" onClick={handleDismiss}>
                Keep shopping
              </button>
              <button
                className="primary full-width"
                type="button"
                data-autofocus
                disabled={!items.length}
                onClick={onBeginCheckout}
              >
                Continue to checkout
                {items.length > 0 ? ` · $${estimatedTotal.toFixed(2)}` : ''}
              </button>
            </div>
            <p className="microcopy">Choose shipping at checkout. Free returns within 60 days.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default CartModal
