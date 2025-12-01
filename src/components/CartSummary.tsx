import type { CartItem } from '../types'

type CartSummaryProps = {
  items: CartItem[]
  total: number
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onClear: () => void
}

const CartSummary = ({ items, total, onIncrement, onDecrement, onClear }: CartSummaryProps) => {
  return (
    <aside className="cart-summary">
      <header>
        <div>
          <p className="eyebrow">Bag preview</p>
          <h2>Ready to check out?</h2>
        </div>
        <button className="text-button" type="button" onClick={onClear} disabled={!items.length}>
          Clear
        </button>
      </header>

      {items.length === 0 ? (
        <p className="muted">Add a few products to see them here.</p>
      ) : (
        <ul className="cart-summary__list">
          {items.map(({ product, quantity }) => (
            <li key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{`$${product.price} · ${product.collections[0]}`}</span>
              </div>
              <div className="cart-summary__quantity">
                <button type="button" onClick={() => onDecrement(product.id)} aria-label={`Remove one ${product.name}`}>
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => onIncrement(product.id)} aria-label={`Add one ${product.name}`}>
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="cart-summary__total">
        <span>Subtotal</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <button className="secondary full-width" type="button" disabled={!items.length}>
        Continue to checkout
      </button>
      <p className="microcopy">Free returns within 60 days. Taxes calculated at checkout.</p>
    </aside>
  )
}

export default CartSummary
