import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StatsigProvider } from '@statsig/react-bindings'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { initStatsig } from './lib/statsig'

void (async () => {
  try {
    await initAnalytics()
  } catch (error) {
    console.error('Amplitude Unified SDK init failed', error)
  }

  let statsigClient = null
  try {
    statsigClient = await initStatsig()
  } catch (error) {
    console.error('Statsig SDK init failed', error)
  }

  const app = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {statsigClient ? <StatsigProvider client={statsigClient}>{app}</StatsigProvider> : app}
    </StrictMode>,
  )
})()
