import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import CartModal from './components/CartModal'
import CheckoutModal from './components/CheckoutModal'
import FittingCallModal, { type FittingCallRequest } from './components/FittingCallModal'
import NewsletterModal from './components/NewsletterModal'
import StatsigLab from './components/StatsigLab'
import Footer from './components/Footer'
import ControlHome from './homepages/ControlHome'
import RunwayHome from './homepages/RunwayHome'
import StudioHome from './homepages/StudioHome'
import { maxPrice, minPrice, products as catalogProducts } from './data/products'
import { NAV_TABS, type NavTabId } from './nav'
import type { BestSellerSort } from './pages/BestSellersPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProfilePage from './pages/ProfilePage'
import type { SortOption } from './types'
import { trackEvent } from './lib/analytics'
import { useHomepageVariant } from './lib/homepageExperiment'
import { logStatsigEvent } from './lib/statsig'
import { StoreProvider, useStore } from './store/StoreContext'

const categories = ['All', ...new Set(catalogProducts.map((product) => product.category))]
const productOrder = new Map(catalogProducts.map((product, index) => [product.id, index] as const))

const StoreShell = () => {
  const navigate = useNavigate()
  const homepageVariant = useHomepageVariant()
  const [activeTab, setActiveTab] = useState<NavTabId>('new-arrivals')
  const [newDropsOnly, setNewDropsOnly] = useState(false)
  const [bestSellerSort, setBestSellerSort] = useState<BestSellerSort>('featured')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [priceCap, setPriceCap] = useState(maxPrice)
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('featured')
  const catalogRef = useRef<HTMLElement | null>(null)
  const hasLoggedHomeView = useRef(false)

  const {
    cartItems,
    cartCount,
    cartTotal,
    cartModalOpen,
    checkoutOpen,
    fittingCallOpen,
    checkoutComplete,
    purchasedTotal,
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
  } = useStore()

  useEffect(() => {
    if (hasLoggedHomeView.current) {
      return
    }
    hasLoggedHomeView.current = true
    trackEvent('home_viewed', {
      totalProducts: catalogProducts.length,
      homepage_variant: homepageVariant,
    })
    logStatsigEvent('home_viewed', undefined, {
      totalProducts: catalogProducts.length,
      homepage_variant: homepageVariant,
    })
  }, [homepageVariant])

  useEffect(() => {
    trackEvent('nav_tab_selected', { tab: activeTab, homepage_variant: homepageVariant })
  }, [activeTab, homepageVariant])

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
      homepage_variant: homepageVariant,
    })
    setActiveTab(tab)
    navigate('/')
  }

  const scrollToCatalog = () => {
    const heroProps = {
      cta: 'explore-the-edit',
      ctaLabel: 'Explore the edit',
      ctaType: 'hero_primary',
      target: 'catalog',
      homepage_variant: homepageVariant,
    }
    trackEvent('hero_primary_clicked', { target: 'catalog', homepage_variant: homepageVariant })
    logStatsigEvent('hero_cta_clicked', undefined, heroProps)
    logStatsigEvent('cta_clicked', undefined, heroProps)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleBookFittingCall = () => {
    const heroProps = {
      cta: 'book-a-fitting-call',
      ctaLabel: 'Book a fitting call',
      ctaType: homepageVariant === 'studio' ? 'hero_primary' : 'hero_secondary',
      target: 'fitting_call_modal',
      homepage_variant: homepageVariant,
    }
    trackEvent('hero_secondary_clicked', { target: 'fitting-call', homepage_variant: homepageVariant })
    logStatsigEvent('hero_cta_clicked', undefined, heroProps)
    logStatsigEvent('cta_clicked', undefined, heroProps)
    trackEvent('fitting_call_modal_opened', {
      source: homepageVariant === 'studio' ? 'hero_primary' : 'hero_secondary',
      homepage_variant: homepageVariant,
    })
    logStatsigEvent('fitting_call_modal_opened', undefined, {
      source: homepageVariant === 'studio' ? 'hero_primary' : 'hero_secondary',
      homepage_variant: homepageVariant,
    })
    openFittingCall()
  }

  const handleDismissFittingCall = (reason: 'cancel' | 'completed') => {
    if (reason === 'cancel') {
      trackEvent('fitting_call_modal_dismissed', {
        source: 'fitting_call_modal',
        homepage_variant: homepageVariant,
      })
      logStatsigEvent('fitting_call_modal_dismissed', undefined, {
        source: 'fitting_call_modal',
        homepage_variant: homepageVariant,
      })
    }
    dismissFittingCall()
  }

  const handleScheduleFittingCall = (request: FittingCallRequest) => {
    trackEvent('fitting_call_scheduled', {
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      hasNotes: request.notes.length > 0,
      notesLength: request.notes.length,
      source: 'fitting_call_modal',
      homepage_variant: homepageVariant,
    })
    logStatsigEvent('fitting_call_scheduled', undefined, {
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      hasNotes: request.notes.length > 0,
      notesLength: request.notes.length,
      source: 'fitting_call_modal',
      homepage_variant: homepageVariant,
    })
    logStatsigEvent('cta_clicked', undefined, {
      cta: 'schedule-fitting-call',
      ctaLabel: 'Schedule fitting call',
      ctaType: 'fitting_call_modal',
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      homepage_variant: homepageVariant,
    })
  }

  const homepageProps = {
    homepageVariant,
    activeTab,
    catalogRef,
    categories,
    activeCategory,
    onCategoryChange: (category: string) => {
      setActiveCategory(category)
      trackEvent('filter_category_selected', { category, homepage_variant: homepageVariant })
    },
    searchTerm,
    onSearchChange: (value: string) => {
      setSearchTerm(value)
      trackEvent('filter_search_updated', {
        queryLength: value.trim().length,
        homepage_variant: homepageVariant,
      })
    },
    priceCap,
    minPrice,
    maxPrice,
    onPriceChange: (value: number) => {
      setPriceCap(value)
      trackEvent('filter_price_cap_changed', { priceCap: value, homepage_variant: homepageVariant })
    },
    onlyInStock,
    onStockToggle: (value: boolean) => {
      setOnlyInStock(value)
      trackEvent('filter_stock_toggled', { onlyInStock: value, homepage_variant: homepageVariant })
    },
    sortOption,
    onSortChange: (value: SortOption) => {
      setSortOption(value)
      trackEvent('sort_changed', { sortOption: value, homepage_variant: homepageVariant })
    },
    newDropsOnly,
    onNewDropsOnlyChange: setNewDropsOnly,
    newArrivalsProducts,
    bestSellerProducts,
    bestSellerSort,
    onBestSellerSortChange: setBestSellerSort,
    cartItems,
    cartTotal,
    onAddToCart: (product: (typeof catalogProducts)[number]) => addToCart(product),
    onIncrement: increment,
    onDecrement: decrement,
    onClear: clearCart,
    onBeginCheckout: beginCheckout,
    onAddKit: addKit,
    onShopCta: scrollToCatalog,
    onBookFitting: handleBookFittingCall,
    totalProducts: catalogProducts.length,
  }

  const Homepage =
    homepageVariant === 'runway' ? RunwayHome : homepageVariant === 'studio' ? StudioHome : ControlHome

  return (
    <div className="app-shell">
      <Header
        cartCount={cartCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenCart={openCart}
        onOpenProfile={() => {
          trackEvent('profile_nav_clicked', { source: 'header', homepage_variant: homepageVariant })
          logStatsigEvent('cta_clicked', undefined, {
            cta: 'account',
            ctaLabel: 'Account',
            ctaType: 'header',
            homepage_variant: homepageVariant,
          })
          navigate('/profile')
        }}
        onGoHome={() => navigate('/')}
      />

      <Routes>
        <Route path="/" element={<Homepage {...homepageProps} />} />
        <Route
          path="/product/:productId"
          element={
            <main className="pdp-main">
              <ProductDetailPage />
            </main>
          }
        />
        <Route
          path="/profile"
          element={
            <main className="profile-main">
              <ProfilePage />
            </main>
          }
        />
        <Route
          path="*"
          element={
            <main className="page-panel">
              <p className="eyebrow">404</p>
              <h1>Page not found</h1>
              <p className="muted">That route isn&apos;t part of this demo store.</p>
              <Link className="primary" to="/" style={{ display: 'inline-block', textAlign: 'center' }}>
                Back to store
              </Link>
            </main>
          }
        />
      </Routes>

      <Footer />

      <CartModal
        open={cartModalOpen}
        items={cartItems}
        total={cartTotal}
        purchaseComplete={checkoutComplete && cartModalOpen}
        purchasedTotal={purchasedTotal}
        onDismiss={dismissCartModal}
        onIncrement={increment}
        onDecrement={decrement}
        onClear={clearCart}
        onBeginCheckout={beginCheckout}
      />

      <CheckoutModal
        open={checkoutOpen}
        itemLines={checkoutLineItems}
        total={cartTotal}
        purchaseComplete={checkoutComplete && checkoutOpen}
        purchasedTotal={purchasedTotal}
        onDismiss={dismissCheckout}
        onConfirmPurchase={(details) => confirmPurchase({ source: 'checkout_modal', ...details })}
      />

      <FittingCallModal
        open={fittingCallOpen}
        onDismiss={handleDismissFittingCall}
        onSchedule={handleScheduleFittingCall}
      />

      <NewsletterModal />
      <StatsigLab />
    </div>
  )
}

function App() {
  return (
    <StoreProvider>
      <StoreShell />
    </StoreProvider>
  )
}

export default App
