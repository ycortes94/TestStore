import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExperiment, useGateValue } from '@statsig/react-bindings'
import NotifyMeModal from '../components/NotifyMeModal'
import { products as catalogProducts } from '../data/products'
import {
  getRecommendedProducts,
  LOW_STOCK_GATE,
  LOW_STOCK_THRESHOLD,
  PDP_RECS_EXPERIMENT,
} from '../lib/shipping'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import { useStore } from '../store/StoreContext'

const ProductDetailPage = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useStore()
  const product = catalogProducts.find((entry) => entry.id === productId)
  const experiment = useExperiment(PDP_RECS_EXPERIMENT)
  const recsHeadline = experiment.get('recs_headline', 'You may also like')
  const recsLayoutRaw = experiment.get('recs_layout', 'grid')
  const recsLayout = recsLayoutRaw === 'rail' ? 'rail' : 'grid'
  const showLowStockUrgency = useGateValue(LOW_STOCK_GATE)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const hasLoggedView = useRef(false)
  const hasLoggedRecs = useRef(false)
  const hasLoggedUrgency = useRef(false)

  const recommendations = useMemo(
    () => (product ? getRecommendedProducts(product, catalogProducts, 4) : []),
    [product],
  )

  useEffect(() => {
    hasLoggedView.current = false
    hasLoggedRecs.current = false
    hasLoggedUrgency.current = false
  }, [productId])

  useEffect(() => {
    if (!product || hasLoggedView.current) {
      return
    }
    hasLoggedView.current = true
    trackEvent('product_viewed', {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
    })
    logStatsigEvent('product_viewed', product.price, {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
    })
  }, [product])

  useEffect(() => {
    if (!product || recommendations.length === 0 || hasLoggedRecs.current) {
      return
    }
    hasLoggedRecs.current = true
    const payload = {
      productId: product.id,
      recsCount: recommendations.length,
      recsLayout,
      recsHeadline,
      groupName: experiment.groupName ?? null,
      recommendedIds: recommendations.map((item) => item.id).join(','),
    }
    trackEvent('recs_impression', payload)
    logStatsigEvent('recs_impression', undefined, payload)
  }, [experiment.groupName, product, recommendations, recsHeadline, recsLayout])

  useEffect(() => {
    if (!product) return
    const showUrgency =
      showLowStockUrgency && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    if (!showUrgency || hasLoggedUrgency.current) {
      return
    }
    hasLoggedUrgency.current = true
    trackEvent('low_stock_badge_viewed', {
      productId: product.id,
      name: product.name,
      stock: product.stock,
      source: 'pdp',
    })
    logStatsigEvent('low_stock_badge_viewed', product.stock, {
      productId: product.id,
      name: product.name,
      stock: product.stock,
      source: 'pdp',
    })
  }, [product, showLowStockUrgency])

  if (!product) {
    return (
      <section className="page-panel pdp-page">
        <p className="eyebrow">Product</p>
        <h1>We couldn&apos;t find that piece</h1>
        <p className="muted">It may have moved, or the link is out of date.</p>
        <button className="primary" type="button" onClick={() => navigate('/')}>
          Back to store
        </button>
      </section>
    )
  }

  const showUrgency =
    showLowStockUrgency && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
  const stockLabel =
    product.stock === 0
      ? 'Back soon'
      : showUrgency
        ? `Only ${product.stock} left`
        : `${product.stock} in stock`

  return (
    <section className="page-panel pdp-page">
      <button className="text-button pdp-page__back" type="button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="pdp-page__hero">
        <div className="pdp-page__media">
          <img src={product.image} alt={product.name} />
          {showUrgency && <span className="pdp-page__urgency">Only {product.stock} left</span>}
        </div>
        <div className="pdp-page__details">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <ul className="product-card__meta">
            <li>
              <strong>${product.price}</strong>
              <span>USD</span>
            </li>
            <li>
              <strong>{product.rating.toFixed(1)}</strong>
              <span>{product.reviews} reviews</span>
            </li>
            <li>
              <strong className={showUrgency ? 'is-urgent' : undefined}>{stockLabel}</strong>
              <span>{product.collections.join(' · ')}</span>
            </li>
          </ul>
          <div className="product-card__tags pdp-page__tags">
            {product.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {product.stock === 0 ? (
            <button className="primary full-width" type="button" onClick={() => setNotifyOpen(true)}>
              Notify me
            </button>
          ) : (
            <button className="primary full-width" type="button" onClick={() => addToCart(product, 'pdp')}>
              Add to bag
            </button>
          )}
        </div>
      </div>

      <NotifyMeModal
        open={notifyOpen}
        product={product}
        source="pdp"
        onDismiss={() => setNotifyOpen(false)}
      />

      {recommendations.length > 0 && (
        <div className="pdp-recs">
          <header className="pdp-recs__header">
            <p className="eyebrow">Recommendations</p>
            <h2>{recsHeadline}</h2>
          </header>
          <div className={recsLayout === 'rail' ? 'pdp-recs__rail' : 'pdp-recs__grid'}>
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                className="pdp-recs__card"
                to={`/product/${rec.id}`}
                onClick={() => {
                  const payload = {
                    productId: product.id,
                    recommendedId: rec.id,
                    recommendedName: rec.name,
                    recsLayout,
                    groupName: experiment.groupName ?? null,
                  }
                  trackEvent('recs_clicked', payload)
                  logStatsigEvent('recs_clicked', undefined, payload)
                }}
              >
                <img src={rec.image} alt={rec.name} loading="lazy" />
                <strong>{rec.name}</strong>
                <span>${rec.price}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ProductDetailPage
