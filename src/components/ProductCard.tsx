import { Link } from 'react-router-dom'
import { useGateValue } from '@statsig/react-bindings'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '../types'
import { LOW_STOCK_GATE, LOW_STOCK_THRESHOLD } from '../lib/shipping'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import NotifyMeModal from './NotifyMeModal'

type ProductCardProps = {
  product: Product
  onAddToCart: (product: Product) => void
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const { name, description, price, rating, reviews, stock, tags, image, collections, id } = product
  const showLowStockUrgency = useGateValue(LOW_STOCK_GATE)
  const isLowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD
  const showUrgency = showLowStockUrgency && isLowStock
  const hasLoggedUrgency = useRef(false)
  const [notifyOpen, setNotifyOpen] = useState(false)

  useEffect(() => {
    if (!showUrgency || hasLoggedUrgency.current) {
      return
    }
    hasLoggedUrgency.current = true
    trackEvent('low_stock_badge_viewed', {
      productId: id,
      name,
      stock,
      source: 'product_card',
    })
    logStatsigEvent('low_stock_badge_viewed', stock, {
      productId: id,
      name,
      stock,
      source: 'product_card',
    })
  }, [id, name, showUrgency, stock])

  const stockLabel = (() => {
    if (stock === 0) return 'Back soon'
    if (showUrgency) return `Only ${stock} left`
    return `${stock} in stock`
  })()

  return (
    <article className="product-card">
      <Link className="product-card__media" to={`/product/${id}`} aria-label={`View ${name}`}>
        <img src={image} alt={name} loading="lazy" />
        <div className="product-card__tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          {showUrgency && <span className="product-card__tag--urgency">Low stock</span>}
        </div>
      </Link>

      <div className="product-card__body">
        <header>
          <h3>
            <Link to={`/product/${id}`}>{name}</Link>
          </h3>
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
            <strong className={showUrgency ? 'is-urgent' : undefined}>{stockLabel}</strong>
            <span>{collections.join(' · ')}</span>
          </li>
        </ul>

        {stock === 0 ? (
          <button className="primary full-width" type="button" onClick={() => setNotifyOpen(true)}>
            Notify me
          </button>
        ) : (
          <button className="primary full-width" type="button" onClick={() => onAddToCart(product)}>
            Add to bag
          </button>
        )}
      </div>

      <NotifyMeModal
        open={notifyOpen}
        product={product}
        source="product_card"
        onDismiss={() => setNotifyOpen(false)}
      />
    </article>
  )
}

export default ProductCard
