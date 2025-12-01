import type { Product } from '../types'
import ProductCard from './ProductCard'

type ProductGridProps = {
  products: Product[]
  onAddToCart: (product: Product) => void
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  if (!products.length) {
    return (
      <div className="empty-state">
        <p>No products match those filters yet. Try widening the search.</p>
      </div>
    )
  }

  return (
    <section className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </section>
  )
}

export default ProductGrid
