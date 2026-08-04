import { useStatsigClient } from '@statsig/react-bindings'
import { useMemo, useState } from 'react'
import { COUPON_GATE, CART_PROMO_CONFIG } from '../lib/coupon'
import { getPlatformEventFields } from '../lib/platform'
import {
  CHECKOUT_SHIPPING_EXPERIMENT,
  FREE_SHIPPING_CONFIG,
  LOW_STOCK_GATE,
  NEWSLETTER_GATE,
  PDP_RECS_EXPERIMENT,
} from '../lib/shipping'
import { triggerNewsletterModal } from '../lib/newsletter'
import { PLATFORM_PROMO_CONFIG } from './PlatformPromoBanner'

/** DEV-only support panel for verifying Statsig evaluations without DevTools. */
const StatsigLab = () => {
  const { client } = useStatsigClient()
  const [open, setOpen] = useState(false)

  const snapshot = useMemo(() => {
    if (!client) return null
    try {
      const context = (
        client as typeof client & {
          getContext?: () => { stableID?: string; options?: { environment?: { tier?: string } } }
        }
      ).getContext?.()
      const couponGate = client.getFeatureGate(COUPON_GATE)
      const lowStockGate = client.getFeatureGate(LOW_STOCK_GATE)
      const newsletterGate = client.getFeatureGate(NEWSLETTER_GATE)
      const hero = client.getExperiment('hero_copy_test')
      const recs = client.getExperiment(PDP_RECS_EXPERIMENT)
      const shipping = client.getExperiment(CHECKOUT_SHIPPING_EXPERIMENT)
      const promo = client.getDynamicConfig(CART_PROMO_CONFIG)
      const freeShipping = client.getDynamicConfig(FREE_SHIPPING_CONFIG)
      const platformBanner = client.getDynamicConfig(PLATFORM_PROMO_CONFIG)
      const platform = getPlatformEventFields()

      return {
        stableID: context?.stableID ?? 'unknown',
        tier: context?.options?.environment?.tier ?? 'production (default)',
        platform,
        gates: [
          { id: COUPON_GATE, value: couponGate.value, reason: couponGate.details.reason },
          { id: LOW_STOCK_GATE, value: lowStockGate.value, reason: lowStockGate.details.reason },
          { id: NEWSLETTER_GATE, value: newsletterGate.value, reason: newsletterGate.details.reason },
        ],
        experiments: [
          {
            id: 'hero_copy_test',
            groupName: hero.groupName,
            reason: hero.details.reason,
            params: {
              hero_headline: hero.get('hero_headline', null),
              hero_primary_cta: hero.get('hero_primary_cta', null),
            },
          },
          {
            id: PDP_RECS_EXPERIMENT,
            groupName: recs.groupName,
            reason: recs.details.reason,
            params: {
              recs_headline: recs.get('recs_headline', null),
              recs_layout: recs.get('recs_layout', null),
            },
          },
          {
            id: CHECKOUT_SHIPPING_EXPERIMENT,
            groupName: shipping.groupName,
            reason: shipping.details.reason,
            params: {
              express_label: shipping.get('express_label', null),
              express_price_usd: shipping.get('express_price_usd', null),
              emphasize_express: shipping.get('emphasize_express', null),
            },
          },
        ],
        configs: [
          {
            id: CART_PROMO_CONFIG,
            reason: promo.details.reason,
            params: {
              threshold_usd: promo.get('threshold_usd', null),
              discount_percent: promo.get('discount_percent', null),
            },
          },
          {
            id: FREE_SHIPPING_CONFIG,
            reason: freeShipping.details.reason,
            params: {
              threshold_usd: freeShipping.get('threshold_usd', null),
              banner_eyebrow: freeShipping.get('banner_eyebrow', null),
            },
          },
          {
            id: PLATFORM_PROMO_CONFIG,
            reason: platformBanner.details.reason,
            params: {
              banner_eyebrow: platformBanner.get('banner_eyebrow', null),
              banner_text: platformBanner.get('banner_text', null),
              banner_cta: platformBanner.get('banner_cta', null),
            },
          },
        ],
      }
    } catch {
      return null
    }
  }, [client, open])

  if (!import.meta.env.DEV || !client) {
    return null
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // ignore clipboard failures in restricted contexts
    }
  }

  return (
    <div className="statsig-lab">
      <button
        className="statsig-lab__toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        Statsig Lab
      </button>
      {open && snapshot && (
        <aside className="statsig-lab__panel" aria-label="Statsig diagnostics">
          <header>
            <strong>Statsig Lab</strong>
            <button className="text-button" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <p className="microcopy">DEV only — for support-agent verification</p>

          <div className="statsig-lab__row">
            <span>stableID</span>
            <code>{snapshot.stableID}</code>
            <button className="text-button" type="button" onClick={() => void copy(snapshot.stableID ?? '')}>
              Copy
            </button>
          </div>
          <div className="statsig-lab__row">
            <span>tier</span>
            <code>{snapshot.tier}</code>
          </div>
          <div className="statsig-lab__row">
            <span>platform</span>
            <code>{JSON.stringify(snapshot.platform)}</code>
          </div>

          <h3>Actions</h3>
          <div className="statsig-lab__actions">
            <button className="secondary" type="button" onClick={() => triggerNewsletterModal()}>
              Trigger newsletter
            </button>
            <p className="microcopy">
              Clears <code>teststore.newsletter.seen</code> and opens the modal (gate must be true). Or use{' '}
              <code>?newsletter=1</code> on the URL.
            </p>
          </div>

          <h3>Gates</h3>
          {snapshot.gates.map((gate) => (
            <div key={gate.id} className="statsig-lab__block">
              <code>{gate.id}</code>
              <span>{String(gate.value)}</span>
              <span className="muted">{gate.reason}</span>
            </div>
          ))}

          <h3>Experiments</h3>
          {snapshot.experiments.map((exp) => (
            <div key={exp.id} className="statsig-lab__block">
              <code>{exp.id}</code>
              <span>{exp.groupName ?? '—'}</span>
              <span className="muted">{exp.reason}</span>
              <pre>{JSON.stringify(exp.params, null, 2)}</pre>
            </div>
          ))}

          <h3>Configs</h3>
          {snapshot.configs.map((cfg) => (
            <div key={cfg.id} className="statsig-lab__block">
              <code>{cfg.id}</code>
              <span className="muted">{cfg.reason}</span>
              <pre>{JSON.stringify(cfg.params, null, 2)}</pre>
            </div>
          ))}
        </aside>
      )}
    </div>
  )
}

export default StatsigLab
