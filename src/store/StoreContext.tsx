import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  cartToPersistedLines,
  hydrateCart,
  loadPersistedCart,
  persistCartLines,
} from '../lib/cartStorage'
import { buildStoredOrder, loadOrders, persistOrder, type StoredOrder } from '../lib/orders'
import { useGateValue } from '@statsig/react-bindings'
import type { Kit } from '../pages/StudioKitsPage'
import type { CartItem, Product } from '../types'
import { trackEvent } from '../lib/analytics'
import { COUPON_GATE, getCouponBreakdown } from '../lib/coupon'
import { useCartPromoRules } from '../hooks/useCartPromoRules'
import { logStatsigEvent } from '../lib/statsig'
import {
  STANDARD_SHIPPING_USD,
  getFreeShippingBreakdown,
  sanitizeExpressShippingUsd,
  sanitizeShippingMethod,
} from '../lib/shipping'
import { useFreeShippingRules } from '../hooks/useFreeShippingRules'

export type PurchaseSource = 'cart_modal' | 'checkout_modal'
export type ShippingMethod = 'standard' | 'express'

export type PurchaseDetails = {
  orderTotal: number
  subtotal: number
  shippingMethod: ShippingMethod
  shippingCost: number
  couponApplied: boolean
  discountAmount: number
  uniqueProducts: number
  totalUnits: number
  items: Array<{ id: string; name: string; quantity: number; price: number }>
  source: PurchaseSource
  shippingGroupName?: string | null
}

type StoreContextValue = {
  cart: Record<string, CartItem>
  cartItems: CartItem[]
  cartCount: number
  cartTotal: number
  cartModalOpen: boolean
  checkoutOpen: boolean
  fittingCallOpen: boolean
  checkoutComplete: boolean
  purchasedTotal: number
  lastPurchase: PurchaseDetails | null
  orders: StoredOrder[]
  openCart: () => void
  dismissCartModal: () => void
  beginCheckout: () => void
  dismissCheckout: () => void
  openFittingCall: () => void
  dismissFittingCall: () => void
  addToCart: (product: Product, source?: string) => void
  increment: (productId: string) => void
  decrement: (productId: string) => void
  clearCart: () => void
  addKit: (kit: Kit, items: Product[]) => void
  confirmPurchase: (details: {
    source: PurchaseSource
    shippingMethod: ShippingMethod
    expressPriceUsd: number
    shippingGroupName?: string | null
  }) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Record<string, CartItem>>(() =>
    hydrateCart(loadPersistedCart()),
  )
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [fittingCallOpen, setFittingCallOpen] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [purchasedTotal, setPurchasedTotal] = useState(0)
  const [lastPurchase, setLastPurchase] = useState<PurchaseDetails | null>(null)
  const [orders, setOrders] = useState<StoredOrder[]>(() => loadOrders())
  const couponFeatureEnabled = useGateValue(COUPON_GATE)
  const promoRules = useCartPromoRules()
  const freeShippingRules = useFreeShippingRules()

  useEffect(() => {
    persistCartLines(cartToPersistedLines(cart))
  }, [cart])

  const cartItems = useMemo(() => Object.values(cart), [cart])
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  )
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
    [cartItems],
  )

  const addToCart = useCallback((product: Product, source = 'product_card') => {
    if (product.stock === 0) return
    let quantityAfterUpdate = 0
    let didUpdate = false
    setCart((current) => {
      const existing = current[product.id]
      const currentQty = existing?.quantity ?? 0
      if (currentQty >= product.stock) {
        quantityAfterUpdate = currentQty
        return current
      }
      const quantity = currentQty + 1
      quantityAfterUpdate = quantity
      didUpdate = true
      return {
        ...current,
        [product.id]: { product, quantity },
      }
    })

    if (didUpdate && quantityAfterUpdate > 0) {
      trackEvent('cart_item_added', {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: quantityAfterUpdate,
        source,
      })
      logStatsigEvent('add_to_cart', product.price, {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: quantityAfterUpdate,
        source,
      })
    }
  }, [])

  const increment = useCallback((productId: string) => {
    let nextQuantity = 0
    let productName = ''
    let didUpdate = false
    setCart((current) => {
      const existing = current[productId]
      if (!existing) return current
      if (existing.quantity >= existing.product.stock) {
        nextQuantity = existing.quantity
        return current
      }
      nextQuantity = existing.quantity + 1
      productName = existing.product.name
      didUpdate = true
      return {
        ...current,
        [productId]: { ...existing, quantity: nextQuantity },
      }
    })

    if (didUpdate && nextQuantity > 0) {
      trackEvent('cart_item_incremented', { productId, name: productName, quantity: nextQuantity })
    }
  }, [])

  const decrement = useCallback((productId: string) => {
    let nextQuantity = 0
    let removed = false
    let productName = ''
    setCart((current) => {
      const existing = current[productId]
      if (!existing) return current
      productName = existing.product.name
      if (existing.quantity === 1) {
        const nextCart = { ...current }
        delete nextCart[productId]
        removed = true
        return nextCart
      }
      nextQuantity = existing.quantity - 1
      return {
        ...current,
        [productId]: { ...existing, quantity: nextQuantity },
      }
    })

    if (removed) {
      trackEvent('cart_item_removed', { productId, name: productName })
      return
    }

    if (nextQuantity > 0) {
      trackEvent('cart_item_decremented', { productId, name: productName, quantity: nextQuantity })
    }
  }, [])

  const clearCart = useCallback(() => {
    const uniqueProducts = cartItems.length
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    setCart({})

    if (totalItems > 0) {
      trackEvent('cart_cleared', { uniqueProducts, totalItems })
    }
  }, [cartItems])

  const openCart = useCallback(() => {
    trackEvent('bag_opened', {
      subtotal: cartTotal,
      uniqueProducts: cartItems.length,
      totalUnits: cartCount,
      source: 'header',
    })
    logStatsigEvent('bag_opened', cartTotal, {
      subtotal: cartTotal,
      uniqueProducts: cartItems.length,
      totalUnits: cartCount,
      source: 'header',
    })
    logStatsigEvent('cta_clicked', undefined, {
      cta: 'bag',
      ctaLabel: 'Bag',
      ctaType: 'header',
      cartCount,
    })
    setCheckoutComplete(false)
    setCheckoutOpen(false)
    setCartModalOpen(true)
  }, [cartCount, cartItems.length, cartTotal])

  const dismissCartModal = useCallback(() => {
    setCartModalOpen(false)
    setCheckoutComplete(false)
  }, [])

  const beginCheckout = useCallback(() => {
    const coupon = getCouponBreakdown(cartTotal, couponFeatureEnabled, promoRules)
    trackEvent('checkout_started', {
      subtotal: cartTotal,
      uniqueProducts: cartItems.length,
      totalUnits: cartCount,
      couponApplied: coupon.eligible,
      discountAmount: coupon.discountAmount,
      source: 'cart_summary',
    })
    logStatsigEvent('checkout_started', cartTotal, {
      subtotal: cartTotal,
      uniqueProducts: cartItems.length,
      totalUnits: cartCount,
      couponApplied: coupon.eligible,
      discountAmount: coupon.discountAmount,
      source: 'cart_summary',
    })
    setCheckoutComplete(false)
    setCartModalOpen(false)
    setCheckoutOpen(true)
  }, [cartCount, cartItems.length, cartTotal, couponFeatureEnabled, promoRules])

  const dismissCheckout = useCallback(() => {
    setCheckoutOpen(false)
    setCheckoutComplete(false)
  }, [])

  const openFittingCall = useCallback(() => {
    setFittingCallOpen(true)
  }, [])

  const dismissFittingCall = useCallback(() => {
    setFittingCallOpen(false)
  }, [])

  const addKit = useCallback((kit: Kit, items: Product[]) => {
    trackEvent('studio_kit_added', {
      kitId: kit.id,
      name: kit.name,
      pieceCount: items.length,
    })
    logStatsigEvent('studio_kit_added', undefined, {
      kitId: kit.id,
      name: kit.name,
      pieceCount: items.length,
      items: items.map((product) => ({ id: product.id, name: product.name, price: product.price })),
    })
    setCart((current) => {
      let next = { ...current }
      for (const product of items) {
        if (product.stock === 0) {
          continue
        }
        const existing = next[product.id]
        const currentQty = existing?.quantity ?? 0
        if (currentQty >= product.stock) {
          continue
        }
        const quantity = currentQty + 1
        next = {
          ...next,
          [product.id]: { product, quantity },
        }
      }
      return next
    })
  }, [])

  const confirmPurchase = useCallback(
    ({
      source,
      shippingMethod,
      expressPriceUsd,
      shippingGroupName,
    }: {
      source: PurchaseSource
      shippingMethod: ShippingMethod
      expressPriceUsd: number
      shippingGroupName?: string | null
    }) => {
      if (cartItems.length === 0) {
        return
      }

      const coupon = getCouponBreakdown(cartTotal, couponFeatureEnabled, promoRules)
      const freeShipping = getFreeShippingBreakdown(cartTotal, freeShippingRules)
      const standardCost = freeShipping.unlocked ? 0 : STANDARD_SHIPPING_USD
      const method = sanitizeShippingMethod(shippingMethod)
      const safeExpress = sanitizeExpressShippingUsd(expressPriceUsd)
      const shippingCost = method === 'express' ? safeExpress : standardCost
      const merchandiseTotal = coupon.eligible ? coupon.totalAfterDiscount : cartTotal
      const orderTotal = merchandiseTotal + shippingCost
      const uniqueProducts = cartItems.length
      const totalUnits = cartCount
      const items = cartItems.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        quantity: product.stock > 0 ? Math.min(quantity, product.stock) : quantity,
        price: product.price,
      }))

      if (source === 'cart_modal') {
        trackEvent('checkout_started', {
          subtotal: cartTotal,
          uniqueProducts,
          totalUnits,
          couponApplied: coupon.eligible,
          discountAmount: coupon.discountAmount,
          source,
        })
        logStatsigEvent('checkout_started', cartTotal, {
          subtotal: cartTotal,
          uniqueProducts,
          totalUnits,
          couponApplied: coupon.eligible,
          discountAmount: coupon.discountAmount,
          source,
        })
      }

      const purchase: PurchaseDetails = {
        orderTotal,
        subtotal: cartTotal,
        shippingMethod: method,
        shippingCost,
        couponApplied: coupon.eligible,
        discountAmount: coupon.discountAmount,
        uniqueProducts,
        totalUnits,
        items,
        source,
        shippingGroupName,
      }

      setPurchasedTotal(orderTotal)
      setLastPurchase(purchase)
      const storedOrder = buildStoredOrder(purchase)
      setOrders(persistOrder(storedOrder))
      trackEvent('purchase_completed', {
        orderTotal,
        subtotal: cartTotal,
        uniqueProducts,
        totalUnits,
        couponApplied: coupon.eligible,
        discountAmount: coupon.discountAmount,
        shippingMethod: method,
        shippingCost,
        shippingGroupName: shippingGroupName ?? null,
        source,
      })
      logStatsigEvent('purchase', orderTotal, {
        items,
        uniqueProducts,
        totalUnits,
        subtotal: cartTotal,
        couponApplied: coupon.eligible,
        discountAmount: coupon.discountAmount,
        shippingMethod: method,
        shippingCost,
        shippingGroupName: shippingGroupName ?? null,
        source,
      })
      setCart({})
      setCheckoutComplete(true)
    },
    [cartCount, cartItems, cartTotal, couponFeatureEnabled, freeShippingRules, promoRules],
  )

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      cartItems,
      cartCount,
      cartTotal,
      cartModalOpen,
      checkoutOpen,
      fittingCallOpen,
      checkoutComplete,
      purchasedTotal,
      lastPurchase,
      orders,
      openCart,
      dismissCartModal,
      beginCheckout,
      dismissCheckout,
      openFittingCall,
      dismissFittingCall,
      addToCart,
      increment,
      decrement,
      clearCart,
      addKit,
      confirmPurchase,
    }),
    [
      cart,
      cartItems,
      cartCount,
      cartTotal,
      cartModalOpen,
      checkoutOpen,
      fittingCallOpen,
      checkoutComplete,
      purchasedTotal,
      lastPurchase,
      orders,
      openCart,
      dismissCartModal,
      beginCheckout,
      dismissCheckout,
      openFittingCall,
      dismissFittingCall,
      addToCart,
      increment,
      decrement,
      clearCart,
      addKit,
      confirmPurchase,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = (): StoreContextValue => {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}
