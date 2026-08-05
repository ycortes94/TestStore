/**
 * Lightweight client platform detection for Statsig targeting + event metadata.
 * Prefers Capacitor native platform when available, then UA Client Hints, then userAgent.
 */

import { Capacitor } from '@capacitor/core'

export type OsFamily = 'ios' | 'android' | 'desktop' | 'other'

export type PlatformInfo = {
  osFamily: OsFamily
  /** Coarse device class for dashboards. */
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'other'
  /** Human-readable label for events (iphone / android / desktop / other). */
  platform: string
  userAgent: string
}

const readUaData = (): { platform?: string; mobile?: boolean } | null => {
  if (typeof navigator === 'undefined') {
    return null
  }
  const uaData = (
    navigator as Navigator & {
      userAgentData?: { platform?: string; mobile?: boolean }
    }
  ).userAgentData
  return uaData ?? null
}

export const getPlatformInfo = (): PlatformInfo => {
  if (typeof navigator === 'undefined') {
    return {
      osFamily: 'other',
      deviceType: 'other',
      platform: 'other',
      userAgent: '',
    }
  }

  const ua = navigator.userAgent || ''

  // Native Capacitor shells report an authoritative OS; prefer that over UA sniffing.
  if (Capacitor.isNativePlatform()) {
    const capPlatform = Capacitor.getPlatform()
    if (capPlatform === 'ios') {
      const isTablet =
        /ipad/i.test(ua) || (navigator.maxTouchPoints > 1 && !/iphone|ipod/i.test(ua))
      return {
        osFamily: 'ios',
        deviceType: isTablet ? 'tablet' : 'mobile',
        platform: isTablet ? 'ipad' : 'iphone',
        userAgent: ua,
      }
    }
    if (capPlatform === 'android') {
      const isTablet = /android/i.test(ua) && !/mobile/i.test(ua)
      return {
        osFamily: 'android',
        deviceType: isTablet ? 'tablet' : 'mobile',
        platform: 'android',
        userAgent: ua,
      }
    }
  }

  const uaData = readUaData()
  const platformHint = (uaData?.platform ?? navigator.platform ?? '').toLowerCase()
  const uaLower = ua.toLowerCase()

  const isIos =
    /iphone|ipad|ipod/.test(uaLower) ||
    platformHint === 'ios' ||
    // iPadOS 13+ may report as Mac; keep classic iPhone/iPad UA match as primary.
    (platformHint.includes('mac') && navigator.maxTouchPoints > 1)

  const isAndroid = /android/.test(uaLower) || platformHint === 'android'

  let osFamily: OsFamily = 'other'
  if (isIos) osFamily = 'ios'
  else if (isAndroid) osFamily = 'android'
  else if (/mac|win|linux|cros/.test(platformHint) || /macintosh|windows|linux/.test(uaLower)) {
    osFamily = 'desktop'
  }

  const isTablet =
    /ipad/.test(uaLower) ||
    (/android/.test(uaLower) && !/mobile/.test(uaLower)) ||
    (osFamily === 'ios' && navigator.maxTouchPoints > 1 && !/iphone|ipod/.test(uaLower))

  const isMobile =
    Boolean(uaData?.mobile) ||
    /iphone|ipod|android.+mobile|windows phone/.test(uaLower) ||
    (osFamily === 'android' && !isTablet)

  let deviceType: PlatformInfo['deviceType'] = 'other'
  if (isTablet) deviceType = 'tablet'
  else if (isMobile || osFamily === 'ios' || osFamily === 'android') deviceType = 'mobile'
  else if (osFamily === 'desktop') deviceType = 'desktop'

  let platform = 'other'
  if (osFamily === 'ios') {
    platform = /ipad/.test(uaLower) || (deviceType === 'tablet' && osFamily === 'ios') ? 'ipad' : 'iphone'
  } else if (osFamily === 'android') {
    platform = 'android'
  } else if (osFamily === 'desktop') {
    platform = 'desktop'
  }

  return {
    osFamily,
    deviceType,
    platform,
    userAgent: ua,
  }
}

/** Flat fields safe to attach to Statsig user.custom + event metadata. */
export const getPlatformEventFields = (): Record<string, string> => {
  const info = getPlatformInfo()
  return {
    os_family: info.osFamily,
    device_type: info.deviceType,
    platform: info.platform,
  }
}
