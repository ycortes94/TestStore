import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor WebViews load the build from a file-like origin, so asset URLs must stay
// relative. GitHub Pages publishes this repo at /<repo>/, so that build sets PAGES_BASE.
const base = process.env.PAGES_BASE || './'

/**
 * index.html loads the Amplitude Web Experimentation script keyed by `%VITE_AMPLITUDE_API_KEY%`.
 * When the key is unset, drop the tag instead of shipping a broken CDN URL.
 */
const amplitudeExperimentTag = (apiKey: string | undefined): Plugin => ({
  name: 'amplitude-experiment-tag',
  transformIndexHtml(html) {
    if (apiKey && apiKey.trim() !== '') {
      return html
    }
    return html.replace(/\s*<script[^>]*cdn\.amplitude\.com\/script\/[^>]*\.experiment\.js"[^>]*><\/script>/, '')
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  return {
    plugins: [react(), amplitudeExperimentTag(env.VITE_AMPLITUDE_API_KEY)],
    base,
  }
})
