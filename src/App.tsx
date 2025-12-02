import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import FilterPanel from './components/FilterPanel'
import ProductGrid from './components/ProductGrid'
import CartSummary from './components/CartSummary'
import Perks from './components/Perks'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'
import { maxPrice, minPrice, products as catalogProducts } from './data/products'
import type { CartItem, Product, SortOption } from './types'
import { trackEvent } from './lib/analytics'

const categories = ['All', ...new Set(catalogProducts.map((product) => product.category))]
const productOrder = new Map(catalogProducts.map((product, index) => [product.id, index] as const))

function App() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [priceCap, setPriceCap] = useState(maxPrice)
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>('featured')
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const catalogRef = useRef<HTMLElement | null>(null)
  const hasLoggedHomeView = useRef(false)

  useEffect(() => {
    if (hasLoggedHomeView.current) {
      return
    }

    hasLoggedHomeView.current = true
    trackEvent('home_viewed', { totalProducts: catalogProducts.length })
  }, [])

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

  const cartItems = Object.values(cart)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0)

  const scrollToCatalog = () => {
    trackEvent('hero_primary_clicked', { target: 'catalog' })
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  return (
    <div className="app-shell">
      <Header cartCount={cartCount} />
      <Hero totalProducts={catalogProducts.length} onPrimaryAction={scrollToCatalog} />

      <main ref={catalogRef}>
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
          <ProductGrid products={filteredProducts} onAddToCart={handleAddToCart} />
          <CartSummary
            items={cartItems}
            total={cartTotal}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onClear={handleClearCart}
          />
        </div>
      </main>

      <Perks />
      <Testimonials />
      <Footer />
    </div>
  )
}

export default App
