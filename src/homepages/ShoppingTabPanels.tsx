import FilterPanel from '../components/FilterPanel'
import ProductGrid from '../components/ProductGrid'
import CartSummary from '../components/CartSummary'
import BestSellersPage from '../pages/BestSellersPage'
import JournalPage from '../pages/JournalPage'
import NewArrivalsIntro from '../pages/NewArrivalsIntro'
import StudioKitsPage from '../pages/StudioKitsPage'
import SupportPage from '../pages/SupportPage'
import type { HomepageProps } from './types'

type ShoppingTabPanelsProps = Pick<
  HomepageProps,
  | 'activeTab'
  | 'categories'
  | 'activeCategory'
  | 'onCategoryChange'
  | 'searchTerm'
  | 'onSearchChange'
  | 'priceCap'
  | 'minPrice'
  | 'maxPrice'
  | 'onPriceChange'
  | 'onlyInStock'
  | 'onStockToggle'
  | 'sortOption'
  | 'onSortChange'
  | 'newDropsOnly'
  | 'onNewDropsOnlyChange'
  | 'newArrivalsProducts'
  | 'bestSellerProducts'
  | 'bestSellerSort'
  | 'onBestSellerSortChange'
  | 'cartItems'
  | 'cartTotal'
  | 'onAddToCart'
  | 'onIncrement'
  | 'onDecrement'
  | 'onClear'
  | 'onBeginCheckout'
  | 'onAddKit'
> & {
  /** When true, hide the sticky cart sidebar on shopping grids (Runway defers bag chrome). */
  hideCartSidebar?: boolean
}

const ShoppingTabPanels = ({
  activeTab,
  categories,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  priceCap,
  minPrice,
  maxPrice,
  onPriceChange,
  onlyInStock,
  onStockToggle,
  sortOption,
  onSortChange,
  newDropsOnly,
  onNewDropsOnlyChange,
  newArrivalsProducts,
  bestSellerProducts,
  bestSellerSort,
  onBestSellerSortChange,
  cartItems,
  cartTotal,
  onAddToCart,
  onIncrement,
  onDecrement,
  onClear,
  onBeginCheckout,
  onAddKit,
  hideCartSidebar = false,
}: ShoppingTabPanelsProps) => {
  const cartSidebar = hideCartSidebar ? null : (
    <CartSummary
      items={cartItems}
      total={cartTotal}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      onClear={onClear}
      onBeginCheckout={onBeginCheckout}
    />
  )

  return (
    <>
      {activeTab === 'new-arrivals' && (
        <>
          <NewArrivalsIntro newDropsOnly={newDropsOnly} onNewDropsOnlyChange={onNewDropsOnlyChange} />
          <FilterPanel
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            priceCap={priceCap}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={onPriceChange}
            onlyInStock={onlyInStock}
            onStockToggle={onStockToggle}
            sortOption={sortOption}
            onSortChange={onSortChange}
          />
          <div className={hideCartSidebar ? 'content-columns content-columns--solo' : 'content-columns'}>
            <div className="shop-column">
              <ProductGrid products={newArrivalsProducts} onAddToCart={onAddToCart} />
            </div>
            {cartSidebar}
          </div>
        </>
      )}

      {activeTab === 'best-sellers' && (
        <div className={hideCartSidebar ? 'content-columns content-columns--solo' : 'content-columns'}>
          <div className="shop-column">
            <BestSellersPage
              products={bestSellerProducts}
              sort={bestSellerSort}
              onSortChange={onBestSellerSortChange}
              onAddToCart={onAddToCart}
            />
          </div>
          {cartSidebar}
        </div>
      )}

      {activeTab === 'studio-kits' && (
        <div className={hideCartSidebar ? 'content-columns content-columns--solo' : 'content-columns'}>
          <div className="shop-column">
            <StudioKitsPage onAddKit={onAddKit} />
          </div>
          {cartSidebar}
        </div>
      )}

      {activeTab === 'journal' && <JournalPage />}
      {activeTab === 'support' && <SupportPage />}
    </>
  )
}

export default ShoppingTabPanels
