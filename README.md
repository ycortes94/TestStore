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
