#!/usr/bin/env bash
# Playwright customer simulation with human-like pacing (override with PLAYWRIGHT_SLOW_MO).
# Extra hero_copy_test visitors: SIM_EXPERIMENT_USERS=8 (default in daily runner).
# Always boots a dedicated Vite server with VITE_STATSIG_TIER=production (does not reuse a
# local `npm run dev` that may still be on the development tier).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PLAYWRIGHT_SLOW_MO="${PLAYWRIGHT_SLOW_MO:-120}"
export SIM_EXPERIMENT_USERS="${SIM_EXPERIMENT_USERS:-8}"
export VITE_STATSIG_TIER="${VITE_STATSIG_TIER:-production}"
# Prevent reusing an existing localhost:5173 that might be on development tier.
export CI="${CI:-true}"
export PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-5180}"

exec npx playwright test tests/customer-simulation.spec.ts "$@"
