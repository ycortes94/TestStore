import { products as catalog } from '../data/products'
import type { Product } from '../types'

type Kit = {
  id: string
  name: string
  blurb: string
  productIds: string[]
  savingsUsd: number
}

const KITS: Kit[] = [
  {
    id: 'sunrise-miles',
    name: 'Sunrise Miles',
    blurb: 'Layer up for early pavement with hydration on deck.',
    productIds: ['running-essentials-kit', 'daily-hydration-kit'],
    savingsUsd: 24,
  },
  {
    id: 'weekend-reset',
    name: 'Weekend Reset',
    blurb: 'Trail-ready footwear plus a packable shell for shifting weather.',
    productIds: ['city-trail-sneaker', 'summit-shell'],
    savingsUsd: 18,
  },
  {
    id: 'studio-core',
    name: 'Studio Core',
    blurb: 'Leggings and crew staples for back-to-back sessions.',
    productIds: ['midnight-legging', 'everyday-crew'],
    savingsUsd: 12,
  },
]

type StudioKitsPageProps = {
  onAddKit: (kit: Kit, resolvedProducts: Product[]) => void
}

const StudioKitsPage = ({ onAddKit }: StudioKitsPageProps) => {
  return (
    <section className="tab-page" aria-labelledby="tab-studio-kits-title">
      <div className="tab-page__heading">
        <p className="eyebrow">Bundles</p>
        <h2 id="tab-studio-kits-title">Studio kits</h2>
        <p className="muted">Curated pairings with a mock bundle discount—add the whole kit to your bag in one tap.</p>
      </div>

      <ul className="kit-grid">
        {KITS.map((kit) => {
          const items = kit.productIds
            .map((id) => catalog.find((product) => product.id === id))
            .filter((product): product is Product => Boolean(product))
          const subtotal = items.reduce((sum, product) => sum + product.price, 0)
          const kitPrice = Math.max(0, subtotal - kit.savingsUsd)
          const disabled = items.some((product) => product.stock === 0)

          return (
            <li key={kit.id} className="kit-card">
              <header>
                <h3>{kit.name}</h3>
                <p className="muted">{kit.blurb}</p>
              </header>
              <ul className="kit-card__lines">
                {items.map((product) => (
                  <li key={product.id}>
                    <span>{product.name}</span>
                    <span>${product.price}</span>
                  </li>
                ))}
              </ul>
              <div className="kit-card__pricing">
                <span className="muted">Bundle price</span>
                <div>
                  <strong>${kitPrice}</strong>
                  <span className="kit-card__strike">${subtotal}</span>
                </div>
              </div>
              <button
                className="primary full-width"
                type="button"
                disabled={disabled}
                onClick={() => onAddKit(kit, items)}
              >
                {disabled ? 'Unavailable — item out of stock' : 'Add kit to bag'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default StudioKitsPage
export type { Kit }
