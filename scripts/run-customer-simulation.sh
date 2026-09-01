#!/usr/bin/env bash
# Playwright customer simulation with human-like pacing (override with PLAYWRIGHT_SLOW_MO).
# Extra homepage_revamp_test visitors: SIM_EXPERIMENT_USERS=100 (default) **per platform**
# (desktop / android / ios Playwright projects ≈ 300 experiment visitors). ~25% are returning
# with a reused Statsig stableID (scoped per platform). Also covers gates/configs/experiments:
# coupon, free shipping, newsletter, PDP recs, checkout shipping, low-stock, notify-me,
# platform banner, profile.
# Always boots a dedicated Vite server with VITE_STATSIG_TIER=production (does not reuse a
# local `npm run dev` that may still be on the development tier).
# Filter platforms: npx playwright test ... --project=desktop (or android / ios).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PLAYWRIGHT_SLOW_MO="${PLAYWRIGHT_SLOW_MO:-40}"
export SIM_EXPERIMENT_USERS="${SIM_EXPERIMENT_USERS:-100}"
export VITE_STATSIG_TIER="${VITE_STATSIG_TIER:-production}"
# Prevent reusing an existing localhost:5173 that might be on development tier.
export CI="${CI:-true}"
# CI defaults to 2 workers in playwright.config; oversubscribe locally since sim tests are
# wait-dominated (slowMo + human pauses), so ~2x cores still scales. Machine has ~8 cores.
export PLAYWRIGHT_WORKERS="${PLAYWRIGHT_WORKERS:-16}"
export PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-5180}"
# Trimmed pauses so the sim finishes under ~5m at 16 workers (faster-than-human pacing).
export SIM_HUMAN_MIN_MS="${SIM_HUMAN_MIN_MS:-120}"
export SIM_HUMAN_MAX_MS="${SIM_HUMAN_MAX_MS:-350}"
# Optional: override pause bounds above; PLAYWRIGHT_SLOW_MO defaults to 40 (was 80).

exec npx playwright test tests/customer-simulation.spec.ts "$@"
