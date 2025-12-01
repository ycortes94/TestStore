import type { Product } from '../types'

type ProductCardProps = {
  product: Product
  onAddToCart: (product: Product) => void
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const { name, description, price, rating, reviews, stock, tags, image, collections } = product

  return (
    <article className="product-card">
      <div className="product-card__media">
        <img src={image} alt={name} loading="lazy" />
        <div className="product-card__tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="product-card__body">
        <header>
          <h3>{name}</h3>
          <p>{description}</p>
        </header>

        <ul className="product-card__meta">
          <li>
            <strong>${price}</strong>
            <span>USD</span>
          </li>
          <li>
            <strong>{rating.toFixed(1)}</strong>
            <span>{reviews} reviews</span>
          </li>
          <li>
            <strong>{stock > 0 ? `${stock} in stock` : 'Back soon'}</strong>
            <span>{collections.join(' · ')}</span>
          </li>
        </ul>

        <button className="primary full-width" type="button" onClick={() => onAddToCart(product)} disabled={stock === 0}>
          {stock === 0 ? 'Notify me' : 'Add to bag'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
