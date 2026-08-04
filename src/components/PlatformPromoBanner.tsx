import { useDynamicConfig } from '@statsig/react-bindings'
import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/analytics'
import { logStatsigEvent } from '../lib/statsig'
import { getPlatformEventFields } from '../lib/platform'

export const PLATFORM_PROMO_CONFIG = 'platform_promo_banner'

const DEFAULTS = {
  bannerEyebrow: 'Storewide',
  bannerText: 'Free returns on every order — desktop and beyond.',
  bannerCta: 'Shop the edit',
}

type PlatformPromoBannerProps = {
  onCta?: () => void
}

/** OS-targeted promo from Dynamic Config `platform_promo_banner` (ios / android / default). */
const PlatformPromoBanner = ({ onCta }: PlatformPromoBannerProps) => {
  const config = useDynamicConfig(PLATFORM_PROMO_CONFIG)
  const eyebrow = config.get('banner_eyebrow', DEFAULTS.bannerEyebrow)
  const text = config.get('banner_text', DEFAULTS.bannerText)
  const cta = config.get('banner_cta', DEFAULTS.bannerCta)
  const hasLogged = useRef(false)

  useEffect(() => {
    if (hasLogged.current) return
    hasLogged.current = true
    const payload = {
      ...getPlatformEventFields(),
      bannerEyebrow: eyebrow,
      reason: config.details.reason,
    }
    trackEvent('platform_promo_banner_viewed', payload)
    logStatsigEvent('platform_promo_banner_viewed', undefined, payload)
  }, [config.details.reason, eyebrow])

  return (
    <aside className="platform-promo-banner" role="status">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <strong>{text}</strong>
      </div>
      {onCta && (
        <button
          className="secondary"
          type="button"
          onClick={() => {
            logStatsigEvent('platform_promo_banner_clicked', undefined, {
              ...getPlatformEventFields(),
              bannerCta: cta,
            })
            trackEvent('platform_promo_banner_clicked', {
              ...getPlatformEventFields(),
              bannerCta: cta,
            })
            onCta()
          }}
        >
          {cta}
        </button>
      )}
    </aside>
  )
}

export default PlatformPromoBanner
