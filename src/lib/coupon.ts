export const COUPON_GATE = 'show_cart_coupon_15'
export const COUPON_THRESHOLD = 200
export const COUPON_PERCENT = 15

export type CouponBreakdown = {
  eligible: boolean
  discountAmount: number
  totalAfterDiscount: number
  amountToUnlock: number
}

/** Coupon requires a cart subtotal strictly greater than $200. */
export const getCouponBreakdown = (subtotal: number, featureEnabled: boolean): CouponBreakdown => {
  const eligible = featureEnabled && subtotal > COUPON_THRESHOLD
  const discountAmount = eligible ? subtotal * (COUPON_PERCENT / 100) : 0
  return {
    eligible,
    discountAmount,
    totalAfterDiscount: subtotal - discountAmount,
    amountToUnlock: Math.max(0.01, COUPON_THRESHOLD + 0.01 - subtotal),
  }
}
