import { products as catalogProducts } from '../data/products'
import { isShoppingTab } from '../nav'
import Testimonials from '../components/Testimonials'
import StudioKitsPage from '../pages/StudioKitsPage'
import ShoppingTabPanels from './ShoppingTabPanels'
import type { HomepageProps } from './types'

const PROOF_PRODUCTS = catalogProducts
  .filter((product) => product.rating >= 4.7)
  .slice(0, 3)

/** Fit-service booking homepage — Studio arm. */
const StudioHome = (props: HomepageProps) => {
  const shopping = isShoppingTab(props.activeTab)

  return (
    <div className="studio-home">
      {shopping && (
        <>
          <section className="studio-hero" aria-labelledby="studio-hero-title">
            <div className="studio-hero__inner">
              <p className="studio-hero__brand">Test Store Studio</p>
              <h1 id="studio-hero-title">Get fitted before you buy.</h1>
              <p className="studio-hero__sub">
                A 15-minute call with our stylists — fabric, sizing, and layering dialed to your training
                cycle. Then shop with confidence.
              </p>
              <div className="studio-hero__actions">
                <button className="studio-hero__cta" type="button" onClick={props.onBookFitting}>
                  Book a fitting call
                </button>
                <button className="studio-hero__secondary" type="button" onClick={props.onShopCta}>
                  Or explore the edit
                </button>
              </div>
            </div>
          </section>

          <section className="studio-proof" aria-labelledby="studio-proof-title">
            <div className="studio-proof__intro">
              <h2 id="studio-proof-title">Trusted by people who train hard</h2>
              <p>Community-rated pieces our stylists reach for first.</p>
            </div>
            <ul className="studio-proof__grid">
              {PROOF_PRODUCTS.map((product) => (
                <li key={product.id}>
                  <img src={product.image} alt="" loading="lazy" />
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.rating.toFixed(1)} · {product.reviews} reviews
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {props.activeTab !== 'studio-kits' && (
            <div className="studio-kits-early">
              <StudioKitsPage onAddKit={props.onAddKit} />
            </div>
          )}

          <Testimonials />

          <p className="studio-catalog-lead">
            Prefer to browse? The full edit is below — still fit-tested, still ready to ship.
          </p>
        </>
      )}

      <main ref={props.catalogRef} id="main-tab-panel" role="tabpanel" aria-live="polite">
        <ShoppingTabPanels {...props} />
      </main>
    </div>
  )
}

export default StudioHome
