# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Test Store is a **frontend-only** React 19 + TypeScript + Vite single-page storefront. There is **no backend, database, or API** — all "server-like" state (cart, orders, newsletter) is persisted client-side in `localStorage`/`sessionStorage` (see `src/lib/orders.ts`, `src/lib/cartStorage.ts`, `src/lib/newsletter.ts`). The only service required to run/test the product is the Vite dev server. `ios/` and `android/` are Capacitor shells that load the built `dist/` in a WebView (native tooling not available in this environment).

### Toolchain
Node 22 + npm (has `package-lock.json`; CI uses `npm ci`). The startup update script runs `npm install`.

### Running / building / linting (standard scripts in `package.json`)
- Dev server: `npm run dev` → http://localhost:5173 (this is the app; the hello-world purchase flow works here).
- Build (also type-checks): `npm run build`.
- Lint: `npm run lint`. Note: lint currently reports pre-existing errors/warnings in the repo (e.g. `src/components/NotifyMeModal.tsx`, `src/store/StoreContext.tsx`); this is not an environment problem — do not "fix" them unless that is the task.

### Tests (Playwright "customer simulation")
- Run with `npm run simulate-customers` (see `scripts/run-customer-simulation.sh`) or directly `npx playwright test`.
- `playwright.config.ts` **auto-starts its own Vite server** (via the `webServer` block) — you do NOT need to run `npm run dev` first. Under `CI=true` it uses port 5180 and does not reuse an existing dev server; locally it uses 5173 and will reuse one.
- Chromium for Playwright is installed via `npx playwright install --with-deps chromium`. Browsers/system libs persist in the VM snapshot, so this normally does not need re-running. If a run fails with a missing-browser error, re-run that command.
- To run a subset without port collisions with a running dev server, pass a distinct port, e.g. `CI=true PLAYWRIGHT_PORT=5181 npx playwright test -g "gift buyer"`.

### Analytics / experimentation (optional)
Statsig (`VITE_STATSIG_CLIENT_KEY`) and Amplitude (`VITE_AMPLITUDE_API_KEY`) are optional. Without keys the app renders fine and falls back to default gate/experiment values (SDK init is capped so it never blocks first paint). Set them (copy `.env.example` → `.env`) only when testing live experiment/analytics behavior end-to-end.
