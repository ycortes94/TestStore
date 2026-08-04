import { useCallback, useEffect, useState } from 'react'
import { useExperiment, useGateValue } from '@statsig/react-bindings'
import CouponPanel from './CouponPanel'
import FreeShippingBanner from './FreeShippingBanner'
import { useCartPromoRules } from '../hooks/useCartPromoRules'
import { useFreeShippingRules } from '../hooks/useFreeShippingRules'
import { useModalA11y } from '../hooks/useModalA11y'
import { COUPON_GATE, getCouponBreakdown } from '../lib/coupon'
import {
  CHECKOUT_SHIPPING_EXPERIMENT,
  STANDARD_SHIPPING_USD,
  getFreeShippingBreakdown,
  sanitizeExpressShippingUsd,
} from '../lib/shipping'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import type { ShippingMethod } from '../store/StoreContext'

type CheckoutLine = { id: string; name: string; quantity: number; lineTotal: number }

type CheckoutModalProps = {
  open: boolean
  itemLines: CheckoutLine[]
  total: number
  purchaseComplete: boolean
  purchasedTotal: number
  onDismiss: () => void
  onConfirmPurchase: (details: {
    shippingMethod: ShippingMethod
    expressPriceUsd: number
    shippingGroupName: string | null
  }) => void
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
  const promoRules = useCartPromoRules()
  const freeShippingRules = useFreeShippingRules()
  const shippingExperiment = useExperiment(CHECKOUT_SHIPPING_EXPERIMENT)
  const expressPriceUsd = sanitizeExpressShippingUsd(
    shippingExperiment.get('express_price_usd', 12),
  )
  const expressLabel = shippingExperiment.get('express_label', 'Express (2-day)')
  const emphasizeExpress = shippingExperiment.get('emphasize_express', false)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  useModalA11y(open, handleDismiss)

  useEffect(() => {
    if (open) {
      setShippingMethod('standard')
    }
  }, [open])

  if (!open) {
    return null
  }

  const itemCount = itemLines.reduce((sum, line) => sum + line.quantity, 0)
  const coupon = getCouponBreakdown(total, couponFeatureEnabled, promoRules)
  const freeShipping = getFreeShippingBreakdown(total, freeShippingRules)
  const standardCost = freeShipping.unlocked ? 0 : STANDARD_SHIPPING_USD
  const shippingCost = shippingMethod === 'express' ? expressPriceUsd : standardCost
  const merchandiseTotal = coupon.eligible ? coupon.totalAfterDiscount : total
  const payableTotal = merchandiseTotal + shippingCost

  const selectShipping = (method: ShippingMethod) => {
    setShippingMethod(method)
    const payload = {
      shippingMethod: method,
      expressPriceUsd,
      emphasizeExpress,
      groupName: shippingExperiment.groupName ?? null,
      standardCost,
    }
    trackEvent('shipping_option_selected', payload)
    logStatsigEvent('shipping_option_selected', undefined, payload)
  }

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={handleDismiss}>
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
              <button className="primary full-width" type="button" data-autofocus onClick={handleDismiss}>
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

            <FreeShippingBanner subtotal={total} hasItems={itemLines.length > 0} source="checkout_modal" />

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

            <CouponPanel
              featureEnabled={couponFeatureEnabled}
              hasItems={itemLines.length > 0}
              breakdown={coupon}
              rules={promoRules}
            />

            <fieldset className="shipping-options">
              <legend>Shipping</legend>
              <label className="shipping-options__option">
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === 'standard'}
                  onChange={() => selectShipping('standard')}
                />
                <span>
                  <strong>Standard (5–7 days)</strong>
                  <span className="muted">
                    {freeShipping.unlocked ? 'Free' : `$${STANDARD_SHIPPING_USD.toFixed(2)}`}
                  </span>
                </span>
              </label>
              <label
                className={
                  emphasizeExpress
                    ? 'shipping-options__option is-emphasized'
                    : 'shipping-options__option'
                }
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === 'express'}
                  onChange={() => selectShipping('express')}
                />
                <span>
                  <strong>{expressLabel}</strong>
                  <span className="muted">${Number(expressPriceUsd).toFixed(2)}</span>
                </span>
              </label>
            </fieldset>

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
              <div className="cart-summary__total">
                <span>Shipping</span>
                <strong>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</strong>
              </div>
              <div className="cart-summary__total">
                <span>Total</span>
                <strong>${payableTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div className="checkout-modal__actions">
              <button className="secondary full-width" type="button" onClick={handleDismiss}>
                Keep shopping
              </button>
              <button
                className="primary full-width"
                type="button"
                data-autofocus
                onClick={() =>
                  onConfirmPurchase({
                    shippingMethod,
                    expressPriceUsd,
                    shippingGroupName: shippingExperiment.groupName ?? null,
                  })
                }
              >
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
