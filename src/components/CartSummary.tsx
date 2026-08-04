import { useGateValue } from '@statsig/react-bindings'
import CouponPanel from './CouponPanel'
import FreeShippingBanner from './FreeShippingBanner'
import { useCartPromoRules } from '../hooks/useCartPromoRules'
import { COUPON_GATE, getCouponBreakdown } from '../lib/coupon'
import type { CartItem } from '../types'

type CartSummaryProps = {
  items: CartItem[]
  total: number
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onClear: () => void
  onBeginCheckout: () => void
}

const CartSummary = ({ items, total, onIncrement, onDecrement, onClear, onBeginCheckout }: CartSummaryProps) => {
  const couponFeatureEnabled = useGateValue(COUPON_GATE)
  const promoRules = useCartPromoRules()
  const coupon = getCouponBreakdown(total, couponFeatureEnabled, promoRules)

  return (
    <aside className="cart-summary">
      <header>
        <div>
          <p className="eyebrow">Bag preview</p>
          <h2>Ready to check out?</h2>
        </div>
        <button className="text-button" type="button" onClick={onClear} disabled={!items.length}>
          Clear
        </button>
      </header>

      <FreeShippingBanner subtotal={total} hasItems={items.length > 0} source="cart_summary" />

      {items.length === 0 ? (
        <p className="muted">Add a few products to see them here.</p>
      ) : (
        <ul className="cart-summary__list">
          {items.map(({ product, quantity }) => (
            <li key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{`$${product.price} · ${product.collections[0]}`}</span>
              </div>
              <div className="cart-summary__quantity">
                <button type="button" onClick={() => onDecrement(product.id)} aria-label={`Remove one ${product.name}`}>
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => onIncrement(product.id)}
                  aria-label={`Add one ${product.name}`}
                  disabled={product.stock > 0 ? quantity >= product.stock : true}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CouponPanel
        featureEnabled={couponFeatureEnabled}
        hasItems={items.length > 0}
        breakdown={coupon}
        rules={promoRules}
      />

      <div className="cart-summary__totals">
        <div className="cart-summary__total">
          <span>Subtotal</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
        {coupon.eligible && (
          <>
            <div className="cart-summary__total cart-summary__total--discount">
              <span>Coupon ({promoRules.discountPercent}% off)</span>
              <strong>−${coupon.discountAmount.toFixed(2)}</strong>
            </div>
            <div className="cart-summary__total">
              <span>Total</span>
              <strong>${coupon.totalAfterDiscount.toFixed(2)}</strong>
            </div>
          </>
        )}
      </div>

      <button className="secondary full-width" type="button" disabled={!items.length} onClick={onBeginCheckout}>
        Continue to checkout
      </button>
      <p className="microcopy">Free returns within 60 days. Taxes calculated at checkout.</p>
    </aside>
  )
}

export default CartSummary
