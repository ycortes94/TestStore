import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor WebViews load the build from a file-like origin, so asset URLs must stay
// relative. GitHub Pages publishes this repo at /<repo>/, so that build sets PAGES_BASE.
const base = process.env.PAGES_BASE || './'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
})
