import type { SortOption } from '../types'

type FilterPanelProps = {
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
}

const FilterPanel = ({
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
}: FilterPanelProps) => {
  return (
    <section className="filters">
      <div className="filters__categories">
        {categories.map((category) => {
          const active = category === activeCategory
          return (
            <button
              key={category}
              className={active ? 'filter-chip is-active' : 'filter-chip'}
              type="button"
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          )
        })}
      </div>

      <div className="filters__controls">
        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Find a product, collection, or tag"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Price up to ${priceCap}</span>
          <input
            type="range"
            min={Math.floor(minPrice)}
            max={maxPrice}
            value={priceCap}
            onChange={(event) => onPriceChange(Number(event.target.value))}
          />
        </label>

        <label className="field checkbox">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(event) => onStockToggle(event.target.checked)}
          />
          <span>Only show in-stock</span>
        </label>

        <label className="field">
          <span>Sort</span>
          <select value={sortOption} onChange={(event) => onSortChange(event.target.value as SortOption)}>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>
    </section>
  )
}

export default FilterPanel
