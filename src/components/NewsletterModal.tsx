import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useGateValue } from '@statsig/react-bindings'
import { NEWSLETTER_GATE } from '../lib/shipping'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import { useModalA11y } from '../hooks/useModalA11y'
import {
  NEWSLETTER_SESSION_KEY,
  NEWSLETTER_TRIGGER_EVENT,
  getNewsletterDelayMs,
  isNewsletterForceShow,
  shouldSkipAutomatedBrowser,
  type NewsletterTrigger,
} from '../lib/newsletter'

const NewsletterModal = () => {
  const enabled = useGateValue(NEWSLETTER_GATE)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const hasShown = useRef(false)

  const show = useCallback(
    (trigger: NewsletterTrigger, options?: { force?: boolean }) => {
      if (!enabled) {
        return
      }
      if (!options?.force) {
        if (hasShown.current) {
          return
        }
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(NEWSLETTER_SESSION_KEY) === '1') {
          return
        }
      }

      hasShown.current = true
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(NEWSLETTER_SESSION_KEY, '1')
      }
      setOpen(true)
      trackEvent('newsletter_modal_shown', { trigger })
      logStatsigEvent('newsletter_modal_shown', undefined, { trigger })
    },
    [enabled],
  )

  useEffect(() => {
    const onManualTrigger = () => {
      show('manual', { force: true })
    }

    window.addEventListener(NEWSLETTER_TRIGGER_EVENT, onManualTrigger)
    return () => {
      window.removeEventListener(NEWSLETTER_TRIGGER_EVENT, onManualTrigger)
    }
  }, [show])

  useEffect(() => {
    if (!enabled || typeof sessionStorage === 'undefined') {
      return
    }

    if (isNewsletterForceShow()) {
      show('query_param', { force: true })
      return
    }

    if (shouldSkipAutomatedBrowser()) {
      return
    }

    if (sessionStorage.getItem(NEWSLETTER_SESSION_KEY) === '1') {
      return
    }

    const timer = window.setTimeout(() => show('timer'), getNewsletterDelayMs())

    const onExitIntent = (event: MouseEvent) => {
      if (event.clientY > 0) {
        return
      }
      show('exit_intent')
    }

    const onDocumentMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        show('exit_intent')
      }
    }

    document.addEventListener('mouseout', onExitIntent)
    document.documentElement.addEventListener('mouseleave', onDocumentMouseLeave)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseout', onExitIntent)
      document.documentElement.removeEventListener('mouseleave', onDocumentMouseLeave)
    }
  }, [enabled, show])

  const dismiss = useCallback(() => {
    setOpen(false)
    trackEvent('newsletter_dismissed', { subscribed })
    logStatsigEvent('newsletter_dismissed', undefined, { subscribed })
  }, [subscribed])

  useModalA11y(enabled && open, dismiss)

  if (!enabled || !open) {
    return null
  }

  const subscribe = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    trackEvent('newsletter_subscribed', { emailDomain: email.split('@')[1] ?? null })
    logStatsigEvent('newsletter_subscribed', undefined, {
      emailDomain: email.split('@')[1] ?? null,
    })
  }

  return (
    <div className="newsletter-modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="newsletter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        onClick={(event) => event.stopPropagation()}
      >
        {subscribed ? (
          <>
            <p className="eyebrow">You&apos;re in</p>
            <h2 id="newsletter-title">Thanks for joining the list</h2>
            <p className="muted">We&apos;ll send early access drops and fitting tips. Demo only — nothing is emailed.</p>
            <button className="primary full-width" type="button" data-autofocus onClick={dismiss}>
              Continue shopping
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Newsletter</p>
            <h2 id="newsletter-title">Get first dibs on new drops</h2>
            <p className="muted">One email a week. No spam — this is a demo subscribe form.</p>
            <form className="newsletter-modal__form" onSubmit={subscribe}>
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
              <div className="newsletter-modal__actions">
                <button className="secondary" type="button" onClick={dismiss}>
                  Not now
                </button>
                <button className="primary" type="submit">
                  Subscribe
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default NewsletterModal
