import type { RefObject } from 'react'
import type { BestSellerSort } from '../pages/BestSellersPage'
import type { Kit } from '../pages/StudioKitsPage'
import type { NavTabId } from '../nav'
import type { CartItem, Product, SortOption } from '../types'
import type { HomepageVariant } from '../lib/homepageExperiment'

export type HomepageProps = {
  homepageVariant: HomepageVariant
  activeTab: NavTabId
  catalogRef: RefObject<HTMLElement | null>
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  searchTerm: string
  onSearchChange: (value: string) => void
  priceCap: number
  minPrice: number
  maxPrice: number
  onPriceChange: (value: number) => void
  onlyInStock: boolean
  onStockToggle: (value: boolean) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
  newDropsOnly: boolean
  onNewDropsOnlyChange: (value: boolean) => void
  newArrivalsProducts: Product[]
  bestSellerProducts: Product[]
  bestSellerSort: BestSellerSort
  onBestSellerSortChange: (sort: BestSellerSort) => void
  cartItems: CartItem[]
  cartTotal: number
  onAddToCart: (product: Product) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onClear: () => void
  onBeginCheckout: () => void
  onAddKit: (kit: Kit, items: Product[]) => void
  onShopCta: () => void
  onBookFitting: () => void
  totalProducts: number
}
