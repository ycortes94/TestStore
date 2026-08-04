import ProductGrid from '../components/ProductGrid'
import type { Product } from '../types'

export type BestSellerSort = 'featured' | 'reviews' | 'rating'

type BestSellersPageProps = {
  products: Product[]
  sort: BestSellerSort
  onSortChange: (sort: BestSellerSort) => void
  onAddToCart: (product: Product) => void
}

const BestSellersPage = ({ products, sort, onSortChange, onAddToCart }: BestSellersPageProps) => {
  const sorted = [...products]
  if (sort === 'reviews') {
    sorted.sort((a, b) => b.reviews - a.reviews)
  } else if (sort === 'rating') {
    sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
  }

  return (
    <>
      <section className="tab-page tab-page--intro" aria-labelledby="tab-best-sellers-title">
        <div className="tab-page__heading">
          <p className="eyebrow">Community favorites</p>
          <h2 id="tab-best-sellers-title">Best sellers</h2>
          <p className="muted">Top movers this season. Switch ranking to explore different angles.</p>
        </div>
        <div className="tab-page__chip-row" role="group" aria-label="Best seller ranking">
          {(
            [
              ['featured', 'Curated order'],
              ['reviews', 'Most reviewed'],
              ['rating', 'Highest rated'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={sort === id ? 'filter-chip is-active' : 'filter-chip'}
              onClick={() => onSortChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <ProductGrid products={sorted} onAddToCart={onAddToCart} />
    </>
  )
}

export default BestSellersPage
