import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Product } from '../types'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import { useModalA11y } from '../hooks/useModalA11y'

type NotifyMeModalProps = {
  open: boolean
  product: Product | null
  source: 'product_card' | 'pdp'
  onDismiss: () => void
}

const NotifyMeModal = ({ open, product, source, onDismiss }: NotifyMeModalProps) => {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const hasLoggedOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setSubmitted(false)
      hasLoggedOpen.current = false
      return
    }
    if (!product || hasLoggedOpen.current) return
    hasLoggedOpen.current = true
    trackEvent('notify_me_opened', {
      productId: product.id,
      name: product.name,
      source,
    })
    logStatsigEvent('notify_me_opened', undefined, {
      productId: product.id,
      name: product.name,
      source,
    })
  }, [open, product, source])

  const dismiss = useCallback(
    (reason: 'cancel' | 'completed' = 'cancel') => {
      if (reason === 'cancel' && product) {
        trackEvent('notify_me_dismissed', {
          productId: product.id,
          name: product.name,
          source,
        })
        logStatsigEvent('notify_me_dismissed', undefined, {
          productId: product.id,
          name: product.name,
          source,
        })
      }
      onDismiss()
    },
    [onDismiss, product, source],
  )

  useModalA11y(open && Boolean(product), () => dismiss('cancel'))

  if (!open || !product) {
    return null
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return

    const emailDomain = email.split('@')[1] ?? null
    trackEvent('notify_me_submitted', {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      emailDomain,
      source,
    })
    logStatsigEvent('notify_me_submitted', product.price, {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      emailDomain,
      source,
    })
    setSubmitted(true)
  }

  return (
    <div className="checkout-modal-backdrop" role="presentation" onClick={() => dismiss('cancel')}>
      <div
        className="checkout-modal notify-me-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {submitted ? (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">You&apos;re on the list</p>
              <h2 id={titleId}>We&apos;ll ping you when it&apos;s back</h2>
              <p className="muted">
                Demo only — nothing is emailed. We recorded interest for <strong>{product.name}</strong>.
              </p>
            </header>
            <div className="checkout-modal__actions">
              <button className="primary full-width" type="button" data-autofocus onClick={() => dismiss('completed')}>
                Continue shopping
              </button>
            </div>
          </>
        ) : (
          <>
            <header className="checkout-modal__header">
              <p className="eyebrow">Back in stock</p>
              <h2 id={titleId}>Notify me about {product.name}</h2>
              <p className="muted">Leave an email and we&apos;ll pretend to alert you when this piece returns.</p>
            </header>
            <form className="notify-me-modal__form" onSubmit={submit}>
              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  data-autofocus
                  data-amp-mask="true"
                  className="amp-mask"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <div className="checkout-modal__actions">
                <button className="secondary full-width" type="button" onClick={() => dismiss('cancel')}>
                  Not now
                </button>
                <button className="primary full-width" type="submit">
                  Notify me
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default NotifyMeModal
