import { useMemo, useRef, useState } from 'react'
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
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return
    setCart((current) => {
      const existing = current[product.id]
      const quantity = existing ? existing.quantity + 1 : 1
      return {
        ...current,
        [product.id]: {
          product,
          quantity,
        },
      }
    })
  }

  const handleIncrement = (productId: string) => {
    setCart((current) => {
      const existing = current[productId]
      if (!existing) return current
      return {
        ...current,
        [productId]: { ...existing, quantity: existing.quantity + 1 },
      }
    })
  }

  const handleDecrement = (productId: string) => {
    setCart((current) => {
      const existing = current[productId]
      if (!existing) return current
      if (existing.quantity === 1) {
        const nextCart = { ...current }
        delete nextCart[productId]
        return nextCart
      }
      return {
        ...current,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const handleClearCart = () => setCart({})

  return (
    <div className="app-shell">
      <Header cartCount={cartCount} />
      <Hero totalProducts={catalogProducts.length} onPrimaryAction={scrollToCatalog} />

      <main ref={catalogRef}>
        <FilterPanel
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priceCap={priceCap}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onPriceChange={setPriceCap}
          onlyInStock={onlyInStock}
          onStockToggle={setOnlyInStock}
          sortOption={sortOption}
          onSortChange={setSortOption}
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
