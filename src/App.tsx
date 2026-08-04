import { useEffect, useMemo, useRef, useState } from 'react'
import { useGateValue } from '@statsig/react-bindings'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import FilterPanel from './components/FilterPanel'
import ProductGrid from './components/ProductGrid'
import CartSummary from './components/CartSummary'
import CartModal from './components/CartModal'
import CheckoutModal from './components/CheckoutModal'
import FittingCallModal, { type FittingCallRequest } from './components/FittingCallModal'
import Perks from './components/Perks'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'
import { maxPrice, minPrice, products as catalogProducts } from './data/products'
import { NAV_TABS, isShoppingTab, type NavTabId } from './nav'
import type { Kit } from './pages/StudioKitsPage'
import BestSellersPage, { type BestSellerSort } from './pages/BestSellersPage'
import JournalPage from './pages/JournalPage'
import NewArrivalsIntro from './pages/NewArrivalsIntro'
import StudioKitsPage from './pages/StudioKitsPage'
import SupportPage from './pages/SupportPage'
import type { CartItem, Product, SortOption } from './types'
import { trackEvent } from './lib/analytics'
import { COUPON_GATE, getCouponBreakdown } from './lib/coupon'
import { logStatsigEvent } from './lib/statsig'

const categories = ['All', ...new Set(catalogProducts.map((product) => product.category))]
const productOrder = new Map(catalogProducts.map((product, index) => [product.id, index] as const))

function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('new-arrivals')
  const [newDropsOnly, setNewDropsOnly] = useState(false)
  const [bestSellerSort, setBestSellerSort] = useState<BestSellerSort>('featured')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [priceCap, setPriceCap] = useState(maxPrice)
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('featured')
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [fittingCallOpen, setFittingCallOpen] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [purchasedTotal, setPurchasedTotal] = useState(0)
  const catalogRef = useRef<HTMLElement | null>(null)
  const hasLoggedHomeView = useRef(false)
  const couponFeatureEnabled = useGateValue(COUPON_GATE)

  useEffect(() => {
    if (hasLoggedHomeView.current) {
      return
    }

    hasLoggedHomeView.current = true
    trackEvent('home_viewed', { totalProducts: catalogProducts.length })
  }, [])

  useEffect(() => {
    trackEvent('nav_tab_selected', { tab: activeTab })
  }, [activeTab])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const matches = catalogProducts
      .filter((product) => (activeCategory === 'All' ? true : product.category === activeCategory))
      .filter((product) => product.price <= priceCap)
      .filter((product) => (onlyInStock ? product.stock > 0 : true))
      .filter((product) => {
        if (!normalizedSearch) return true
        return (
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.description.toLowerCase().includes(normalizedSearch) ||
          product.collections.some((collection) => collection.toLowerCase().includes(normalizedSearch)) ||
          product.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
        )
      })

    const sorted = [...matches]
    sorted.sort((a, b) => {
      if (sortOption === 'price-asc') return a.price - b.price
      if (sortOption === 'price-desc') return b.price - a.price
      if (sortOption === 'rating') return b.rating - a.rating
      return (productOrder.get(a.id) ?? 0) - (productOrder.get(b.id) ?? 0)
    })

    return sorted
  }, [activeCategory, priceCap, onlyInStock, searchTerm, sortOption])

  const newArrivalsProducts = useMemo(() => {
    if (!newDropsOnly) {
      return filteredProducts
    }
    return filteredProducts.filter((product) => product.tags.some((tag) => tag.toLowerCase() === 'new'))
  }, [filteredProducts, newDropsOnly])

  const bestSellerProducts = useMemo(
    () => catalogProducts.filter((product) => product.tags.some((tag) => tag.toLowerCase().includes('best seller'))),
    [],
  )

  const cartItems = Object.values(cart)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0)

  const checkoutLineItems = useMemo(
    () =>
      cartItems.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        quantity,
        lineTotal: product.price * quantity,
      })),
    [cartItems],
  )

  const handleTabChange = (tab: NavTabId) => {
    logStatsigEvent('cta_clicked', undefined, {
      cta: tab,
      ctaLabel: NAV_TABS.find((navTab) => navTab.id === tab)?.label ?? tab,
      ctaType: 'nav_tab',
    })
    setActiveTab(tab)
  }

  const scrollToCatalog = () => {
    trackEvent('hero_primary_clicked', { target: 'catalog' })
    logStatsigEvent('cta_clicked', undefined, {
      cta: 'explore-the-edit',
      ctaLabel: 'Explore the edit',
      ctaType: 'hero_primary',
      target: 'catalog',
    })
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleBookFittingCall = () => {
    trackEvent('hero_secondary_clicked', { target: 'fitting-call' })
    logStatsigEvent('cta_clicked', undefined, {
      cta: 'book-a-fitting-call',
      ctaLabel: 'Book a fitting call',
      ctaType: 'hero_secondary',
      target: 'fitting_call_modal',
    })
    trackEvent('fitting_call_modal_opened', { source: 'hero_secondary' })
    logStatsigEvent('fitting_call_modal_opened', undefined, { source: 'hero_secondary' })
    setFittingCallOpen(true)
  }

  const handleDismissFittingCall = (reason: 'cancel' | 'completed') => {
    if (reason === 'cancel') {
      trackEvent('fitting_call_modal_dismissed', { source: 'fitting_call_modal' })
      logStatsigEvent('fitting_call_modal_dismissed', undefined, { source: 'fitting_call_modal' })
    }
    setFittingCallOpen(false)
  }

  const handleScheduleFittingCall = (request: FittingCallRequest) => {
    trackEvent('fitting_call_scheduled', {
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      hasNotes: request.notes.length > 0,
      notesLength: request.notes.length,
      source: 'fitting_call_modal',
    })
    logStatsigEvent('fitting_call_scheduled', undefined, {
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      hasNotes: request.notes.length > 0,
      notesLength: request.notes.length,
      source: 'fitting_call_modal',
    })
    logStatsigEvent('cta_clicked', undefined, {
      cta: 'schedule-fitting-call',
      ctaLabel: 'Schedule fitting call',
      ctaType: 'fitting_call_modal',
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
    })
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    trackEvent('filter_category_selected', { category })
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    trackEvent('filter_search_updated', { queryLength: value.trim().length })
  }

  const handlePriceChange = (value: number) => {
    setPriceCap(value)
    trackEvent('filter_price_cap_changed', { priceCap: value })
  }

  const handleStockToggle = (value: boolean) => {
    setOnlyInStock(value)
    trackEvent('filter_stock_toggled', { onlyInStock: value })
  }

  const handleSortChange = (value: SortOption) => {
    setSortOption(value)
    trackEvent('sort_changed', { sortOption: value })
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return
    let quantityAfterUpdate = 0
    setCart((current) => {
      const existing = current[product.id]
      const quantity = existing ? existing.quantity + 1 : 1
      quantityAfterUpdate = quantity
      return {
        ...current,
        [product.id]: {
          product,
          quantity,
        },
      }
    })

    if (quantityAfterUpdate > 0) {
      trackEvent('cart_item_added', {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: quantityAfterUpdate,
      })
      logStatsigEvent('add_to_cart', product.price, {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: quantityAfterUpdate,
      })
    }
  }

  const handleIncrement = (productId: string) => {
    let nextQuantity = 0
    let productName = ''
    setCart((current) => {
      const existing = current[productId]
      if (!existing) return current
      nextQuantity = existing.quantity + 1
      productName = existing.product.name
      return {
        ...current,
        [productId]: { ...existing, quantity: nextQuantity },
      }
    })

    if (nextQuantity > 0) {
      trackEvent('cart_item_incremented', { productId, name: productName, quantity: nextQuantity })
    }
  }

  const handleDecrement = (productId: string) => {
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
  }

  const handleClearCart = () => {
    const uniqueProducts = cartItems.length
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    setCart({})

    if (totalItems > 0) {
      trackEvent('cart_cleared', { uniqueProducts, totalItems })
    }
  }

  const handleOpenCart = () => {
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
  }

  const handleBeginCheckout = () => {
    const coupon = getCouponBreakdown(cartTotal, couponFeatureEnabled)
    trackEvent('checkout_started', {
      subtotal: cartTotal,
      uniqueProducts: cartItems.length,
      totalUnits: cartCount,
      couponApplied: coupon.eligible,
      discountAmount: coupon.discountAmount,
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
  }

  const handleConfirmPurchase = (source: 'cart_modal' | 'checkout_modal' = 'checkout_modal') => {
    if (cartItems.length === 0) {
      return
    }

    const coupon = getCouponBreakdown(cartTotal, couponFeatureEnabled)
    const orderTotal = coupon.totalAfterDiscount
    const uniqueProducts = cartItems.length
    const totalUnits = cartCount
    const items = cartItems.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      quantity,
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

    setPurchasedTotal(orderTotal)
    trackEvent('purchase_completed', {
      orderTotal,
      subtotal: cartTotal,
      uniqueProducts,
      totalUnits,
      couponApplied: coupon.eligible,
      discountAmount: coupon.discountAmount,
      source,
    })
    logStatsigEvent('purchase', orderTotal, {
      items,
      uniqueProducts,
      totalUnits,
      subtotal: cartTotal,
      couponApplied: coupon.eligible,
      discountAmount: coupon.discountAmount,
      source,
    })
    setCart({})
    setCheckoutComplete(true)
  }

  const handleDismissCartModal = () => {
    setCartModalOpen(false)
    setCheckoutComplete(false)
  }

  const handleDismissCheckout = () => {
    setCheckoutOpen(false)
    setCheckoutComplete(false)
  }

  const handleAddKit = (kit: Kit, items: Product[]) => {
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
        const quantity = existing ? existing.quantity + 1 : 1
        next = {
          ...next,
          [product.id]: { product, quantity },
        }
      }
      return next
    })
  }

  return (
    <div className="app-shell">
      <Header
        cartCount={cartCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={handleOpenCart}
      />

      {isShoppingTab(activeTab) && (
        <Hero
          totalProducts={catalogProducts.length}
          onPrimaryAction={scrollToCatalog}
          onSecondaryAction={handleBookFittingCall}
        />
      )}

      <main ref={catalogRef} id="main-tab-panel" role="tabpanel" aria-live="polite">
        {activeTab === 'new-arrivals' && (
          <>
            <NewArrivalsIntro newDropsOnly={newDropsOnly} onNewDropsOnlyChange={setNewDropsOnly} />
            <FilterPanel
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              priceCap={priceCap}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onPriceChange={handlePriceChange}
              onlyInStock={onlyInStock}
              onStockToggle={handleStockToggle}
              sortOption={sortOption}
              onSortChange={handleSortChange}
            />
            <div className="content-columns">
              <div className="shop-column">
                <ProductGrid products={newArrivalsProducts} onAddToCart={handleAddToCart} />
              </div>
              <CartSummary
                items={cartItems}
                total={cartTotal}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onClear={handleClearCart}
                onBeginCheckout={handleBeginCheckout}
              />
            </div>
          </>
        )}

        {activeTab === 'best-sellers' && (
          <div className="content-columns">
            <div className="shop-column">
              <BestSellersPage
                products={bestSellerProducts}
                sort={bestSellerSort}
                onSortChange={setBestSellerSort}
                onAddToCart={handleAddToCart}
              />
            </div>
            <CartSummary
              items={cartItems}
              total={cartTotal}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onClear={handleClearCart}
              onBeginCheckout={handleBeginCheckout}
            />
          </div>
        )}

        {activeTab === 'studio-kits' && (
          <div className="content-columns">
            <div className="shop-column">
              <StudioKitsPage onAddKit={handleAddKit} />
            </div>
            <CartSummary
              items={cartItems}
              total={cartTotal}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onClear={handleClearCart}
              onBeginCheckout={handleBeginCheckout}
            />
          </div>
        )}

        {activeTab === 'journal' && <JournalPage />}
        {activeTab === 'support' && <SupportPage />}
      </main>

      {isShoppingTab(activeTab) && (
        <>
          <Perks />
          <Testimonials />
        </>
      )}

      <Footer />

      <CartModal
        open={cartModalOpen}
        items={cartItems}
        total={cartTotal}
        purchaseComplete={checkoutComplete && cartModalOpen}
        purchasedTotal={purchasedTotal}
        onDismiss={handleDismissCartModal}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onClear={handleClearCart}
        onConfirmPurchase={() => handleConfirmPurchase('cart_modal')}
      />

      <CheckoutModal
        open={checkoutOpen}
        itemLines={checkoutLineItems}
        total={cartTotal}
        purchaseComplete={checkoutComplete && checkoutOpen}
        purchasedTotal={purchasedTotal}
        onDismiss={handleDismissCheckout}
        onConfirmPurchase={() => handleConfirmPurchase('checkout_modal')}
      />

      <FittingCallModal
        open={fittingCallOpen}
        onDismiss={handleDismissFittingCall}
        onSchedule={handleScheduleFittingCall}
      />
    </div>
  )
}

export default App
