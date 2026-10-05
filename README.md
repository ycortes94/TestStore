# Test Store

A single-page demo storefront built with React, TypeScript, and Vite. It showcases curated products, interactive filters, and a lightweight cart preview so you can test the overall shopping flow without needing a backend.

## Features

- Editorial hero section with scroll-to-catalog CTA and merchandising badges
- Filter panel with category chips, search, in-stock toggle, price slider, and sort options
- Product grid backed by typed sample data, including availability, reviews, and tags
- Cart summary sidebar with quantity controls, subtotal math, and quick actions
- Editorial extras such as perks, testimonials, and a simple footer for a complete layout
- Capacitor iOS/Android shells for native device testing (same web UI)

## Getting started

```bash
npm install
npm run dev   # start Vite dev server on http://localhost:5173
npm run build # type-check and create a production build in dist/
```

## GitHub Pages

The storefront is a client-side app, so Pages needs two things the local dev server gets for free: asset URLs under `/TestStore/`, and a copy of `index.html` at `404.html` so routes like `/product/:id` still load on refresh.

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds with `PAGES_BASE=/TestStore/` and deploys the `dist/` folder. After the first push, turn the site on once:

1. GitHub → **Settings** → **Pages**
2. **Build and deployment** → **Source**: GitHub Actions

The site is then at `https://ycortes94.github.io/TestStore/`. Local `npm run dev` and Capacitor builds are unchanged (`base: './'`).

## Mobile testing

### Phone browsers (works immediately)

Serve the app on your LAN so iPhone Safari / Android Chrome can open it:

```bash
npm run dev:mobile
```

Vite prints a Network URL (for example `http://192.168.x.x:5173`). Open that on a phone on the same Wi‑Fi. The layout uses a scrollable tab strip, safe-area insets, and larger tap targets under ~720px width.

### Native Capacitor apps (iOS / Android)

The project includes Capacitor platforms under `ios/` and `android/`. They load the production `dist/` build inside a native WebView so Statsig platform targeting sees real iOS/Android.

**Prerequisites**

- **iOS:** Xcode from the Mac App Store (dependencies use Swift Package Manager, so CocoaPods is not required)
- **Android:** [Android Studio](https://developer.android.com/studio) with an emulator or USB device

**Build and open**

```bash
npm run build:mobile   # production build + cap sync
npm run cap:ios        # opens the Xcode project
npm run cap:android    # opens the Android Studio project
```

Then press Run in the IDE to install on a simulator/emulator or connected device. After any web UI change, re-run `npm run build:mobile` (or `npm run build && npx cap sync`) before testing again — the native shells load the copied `dist/` build, not the dev server.

**Android from the command line**

Android Studio's Run button is the easiest path, but you can also build and install directly:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npm run build:mobile
(cd android && ./gradlew assembleDebug)
~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Note that a freshly created emulator often has no working internet connection. The storefront still renders (analytics/experiment SDK init is capped so it can never block the first paint), but Amplitude and Statsig will fall back to defaults until the emulator has network.

## Analytics

The storefront ships with the Amplitude Browser SDK 2.x for lightweight instrumentation. Provide an API key through Vite to enable it:

```
VITE_AMPLITUDE_API_KEY=YOUR_API_KEY
```

Locally, put it in `.env` (see `.env.example`). In CI, the GitHub Pages deploy and the daily customer simulation read it from the `VITE_AMPLITUDE_API_KEY` repository secret (Settings → Secrets and variables → Actions). No key is hardcoded; without one, analytics is a no-op. With the key in place, the app tracks basic funnel events such as hero interactions, filter usage, and cart changes so you can evaluate flows in Amplitude.

## Project structure

```
src/
├── components/   # Reusable UI sections (hero, filters, cart, etc.)
├── data/         # Typed product catalog and price helpers
├── types.ts      # Shared TypeScript interfaces
├── App.tsx       # Page composition & cart logic
└── App.css       # Presentation layer (paired with index.css base styles)
ios/              # Capacitor iOS shell
android/          # Capacitor Android shell
capacitor.config.ts
```

Feel free to swap in your own product data or extend the cart logic for a larger prototype.
