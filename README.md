# Test Store

A single-page demo storefront built with React, TypeScript, and Vite. It showcases curated products, interactive filters, and a lightweight cart preview so you can test the overall shopping flow without needing a backend.

## Features

- Editorial hero section with scroll-to-catalog CTA and merchandising badges
- Filter panel with category chips, search, in-stock toggle, price slider, and sort options
- Product grid backed by typed sample data, including availability, reviews, and tags
- Cart summary sidebar with quantity controls, subtotal math, and quick actions
- Editorial extras such as perks, testimonials, and a simple footer for a complete layout

## Getting started

```bash
npm install
npm run dev   # start Vite dev server on http://localhost:5173
npm run build # type-check and create a production build in dist/
```

## Analytics

The storefront ships with the Amplitude Browser SDK 2.x for lightweight instrumentation. Provide an API key through Vite to enable it:

```
VITE_AMPLITUDE_API_KEY=YOUR_API_KEY
```

This project key is preconfigured in code for convenience, but you can override it with your own environment variable for isolated testing. With the key in place, the app tracks basic funnel events such as hero interactions, filter usage, and cart changes so you can evaluate flows in Amplitude.

## Project structure

```
src/
├── components/   # Reusable UI sections (hero, filters, cart, etc.)
├── data/         # Typed product catalog and price helpers
├── types.ts      # Shared TypeScript interfaces
├── App.tsx       # Page composition & cart logic
└── App.css       # Presentation layer (paired with index.css base styles)
```

Feel free to swap in your own product data or extend the cart logic for a larger prototype.
