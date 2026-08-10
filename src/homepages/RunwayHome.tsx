import { Link } from 'react-router-dom'
import { products as catalogProducts } from '../data/products'
import { isShoppingTab } from '../nav'
import ShoppingTabPanels from './ShoppingTabPanels'
import type { HomepageProps } from './types'

const FEATURED = catalogProducts.slice(0, 4)

/** Product-first commerce homepage — Runway arm. */
const RunwayHome = (props: HomepageProps) => {
  const shopping = isShoppingTab(props.activeTab)

  return (
    <div className="runway-home">
      {shopping && (
        <>
          <section className="runway-hero" aria-labelledby="runway-hero-title">
            <div className="runway-hero__atmosphere" aria-hidden="true" />
            <div className="runway-hero__inner">
              <p className="runway-hero__brand">Test Store</p>
              <h1 id="runway-hero-title">Move in gear that earns its keep.</h1>
              <p className="runway-hero__sub">
                Field-tested drops, ready to ship. Skip the scroll — shop what&apos;s live now.
              </p>
              <button className="runway-hero__cta" type="button" onClick={props.onShopCta}>
                Shop the runway
              </button>
            </div>
          </section>

          <section className="runway-featured" aria-labelledby="runway-featured-title">
            <div className="runway-featured__header">
              <h2 id="runway-featured-title">On the floor</h2>
              <p>Four pieces pulling the most bags this week.</p>
            </div>
            <ul className="runway-featured__strip">
              {FEATURED.map((product) => (
                <li key={product.id}>
                  <Link className="runway-featured__card" to={`/product/${product.id}`}>
                    <img src={product.image} alt="" loading="lazy" />
                    <div>
                      <strong>{product.name}</strong>
                      <span>${product.price}</span>
                    </div>
                  </Link>
                  <button
                    className="runway-featured__add"
                    type="button"
                    onClick={() => props.onAddToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Sold out' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <p className="runway-promo">
            Free returns on every order · Carbon-neutral shipping since 2020
          </p>
        </>
      )}

      <main ref={props.catalogRef} id="main-tab-panel" role="tabpanel" aria-live="polite">
        <ShoppingTabPanels {...props} hideCartSidebar={shopping} />
      </main>

      {shopping && cartItemsFooter(props)}
    </div>
  )
}

function cartItemsFooter(props: HomepageProps) {
  if (props.cartItems.length === 0) {
    return null
  }

  return (
    <div className="runway-bag-bar">
      <span>
        {props.cartItems.reduce((n, item) => n + item.quantity, 0)} in bag · ${props.cartTotal.toFixed(0)}
      </span>
      <button className="primary" type="button" onClick={props.onBeginCheckout}>
        Checkout
      </button>
    </div>
  )
}

export default RunwayHome
