import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatsigProvider } from '@statsig/react-bindings'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { initStatsig } from './lib/statsig'

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter

/**
 * SDK init runs before the first render so experiments resolve without flicker. On device
 * WebViews those network calls can stall indefinitely, which would leave a blank screen, so
 * cap how long the storefront waits for them.
 */
const INIT_TIMEOUT_MS = 4000

const withInitTimeout = async <T,>(work: Promise<T>, label: string): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`${label} init exceeded ${INIT_TIMEOUT_MS}ms; rendering without it.`)
          resolve(null)
        }, INIT_TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

void (async () => {
  try {
    await withInitTimeout(initAnalytics(), 'Amplitude Unified SDK')
  } catch (error) {
    console.error('Amplitude Unified SDK init failed', error)
  }

  let statsigClient = null
  try {
    statsigClient = await withInitTimeout(initStatsig(), 'Statsig SDK')
  } catch (error) {
    console.error('Statsig SDK init failed', error)
  }

  const app = (
    <Router>
      <App />
    </Router>
  )

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {statsigClient ? <StatsigProvider client={statsigClient}>{app}</StatsigProvider> : app}
    </StrictMode>,
  )
})()
