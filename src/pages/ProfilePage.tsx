import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStatsigClient } from '@statsig/react-bindings'
import { trackEvent } from '../lib/analytics'
import { getPlatformEventFields, getPlatformInfo } from '../lib/platform'
import type { StoredOrder } from '../lib/orders'
import { getStatsigStableID, logStatsigEvent } from '../lib/statsig'
import { useStore } from '../store/StoreContext'

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const shippingLabel = (order: StoredOrder): string => {
  const method = order.shippingMethod === 'express' ? 'Express' : 'Standard'
  if (order.shippingGroupName) {
    return `${method} · ${order.shippingGroupName}`
  }
  return method
}

const ProfilePage = () => {
  const { orders } = useStore()
  const { client } = useStatsigClient()
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const hasLoggedProfileView = useRef(false)

  const stableID = useMemo(() => getStatsigStableID(), [client])

  const platform = useMemo(() => getPlatformInfo(), [])
  const displayName = stableID ? `Shopper ${stableID.slice(0, 8)}…` : 'Guest shopper'

  useEffect(() => {
    if (hasLoggedProfileView.current) {
      return
    }
    hasLoggedProfileView.current = true

    trackEvent('profile_viewed', {
      orderCount: orders.length,
      stableID: stableID ?? null,
      displayName,
      ...getPlatformEventFields(),
    })
    logStatsigEvent('profile_viewed', orders.length, {
      orderCount: orders.length,
      stableID: stableID ?? null,
      displayName,
    })

    if (orders.length > 0) {
      trackEvent('order_history_viewed', {
        orderCount: orders.length,
        newestOrderId: orders[0]?.id ?? null,
        newestOrderTotal: orders[0]?.orderTotal ?? null,
      })
      logStatsigEvent('order_history_viewed', orders.length, {
        orderCount: orders.length,
        newestOrderId: orders[0]?.id ?? null,
      })
    }
  }, [displayName, orders, stableID])

  const handleToggleOrder = (order: StoredOrder) => {
    const nextExpanded = expandedOrderId === order.id ? null : order.id
    setExpandedOrderId(nextExpanded)

    if (nextExpanded) {
      trackEvent('order_detail_viewed', {
        orderId: order.id,
        orderTotal: order.orderTotal,
        itemCount: order.items.length,
        totalUnits: order.totalUnits,
        shippingMethod: order.shippingMethod,
        source: order.source,
      })
      logStatsigEvent('order_detail_viewed', order.orderTotal, {
        orderId: order.id,
        itemCount: order.items.length,
        totalUnits: order.totalUnits,
        shippingMethod: order.shippingMethod,
        source: order.source,
      })
    }
  }

  return (
    <section className="page-panel profile-page" aria-labelledby="profile-title">
      <Link className="profile-page__back text-button" to="/">
        ← Back to store
      </Link>

      <header className="profile-page__header">
        <p className="eyebrow">This device</p>
        <h1 id="profile-title">{displayName}</h1>
        <p className="muted profile-page__meta">
          Demo profile — order history is stored only in this browser (not a signed-in account).
          {' · '}
          {stableID ? (
            <>
              Statsig stableID <code className="profile-page__code">{stableID}</code>
            </>
          ) : (
            'Anonymous guest session'
          )}
          {' · '}
          {platform.platform} · {platform.deviceType}
        </p>
      </header>

      <div className="profile-page__section">
        <div className="tab-page__heading">
          <h2>Order history</h2>
          <p className="muted">
            {orders.length === 0
              ? 'Completed purchases will appear here after checkout.'
              : `${orders.length} order${orders.length === 1 ? '' : 's'} on this device`}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="profile-empty">
            <p className="profile-empty__title">No orders yet</p>
            <p className="muted">Add items to your bag and complete checkout to see your history.</p>
            <Link className="primary profile-empty__cta" to="/">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="order-history">
            {orders.map((order) => {
              const expanded = expandedOrderId === order.id
              const merchandiseTotal = order.couponApplied
                ? order.subtotal - order.discountAmount
                : order.subtotal

              return (
                <li key={order.id} className="order-card">
                  <button
                    type="button"
                    className="order-card__summary"
                    aria-expanded={expanded}
                    onClick={() => handleToggleOrder(order)}
                  >
                    <div className="order-card__summary-main">
                      <span className="order-card__id">{order.id}</span>
                      <span className="muted">{formatDate(order.placedAt)}</span>
                    </div>
                    <div className="order-card__summary-side">
                      <strong>${order.orderTotal.toFixed(2)}</strong>
                      <span className="muted" aria-hidden>
                        {expanded ? '▴' : '▾'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="order-card__detail">
                      <ul className="order-card__items">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.id}`}>
                            <span>
                              {item.name}
                              <span className="muted">{` × ${item.quantity}`}</span>
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>

                      <dl className="order-card__totals">
                        <div>
                          <dt>Subtotal</dt>
                          <dd>${order.subtotal.toFixed(2)}</dd>
                        </div>
                        {order.couponApplied && (
                          <div>
                            <dt>Discount</dt>
                            <dd>−${order.discountAmount.toFixed(2)}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Merchandise</dt>
                          <dd>${merchandiseTotal.toFixed(2)}</dd>
                        </div>
                        <div>
                          <dt>Shipping ({shippingLabel(order)})</dt>
                          <dd>{order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`}</dd>
                        </div>
                        <div className="order-card__total-row">
                          <dt>Total</dt>
                          <dd>${order.orderTotal.toFixed(2)}</dd>
                        </div>
                      </dl>

                      <p className="microcopy order-card__source">
                        Placed via {order.source === 'checkout_modal' ? 'checkout modal' : 'bag quick checkout'}
                        {' · '}
                        {order.totalUnits} item{order.totalUnits === 1 ? '' : 's'}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default ProfilePage
