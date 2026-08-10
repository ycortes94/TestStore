#!/usr/bin/env bash
# Runs the Playwright customer simulation and appends output to logs/daily-simulation.log
# Intended for cron or launchd; ensure Node/npm are on PATH (Homebrew: /opt/homebrew/bin or /usr/local/bin).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# Optional: load nvm so `npm` exists when this runs from launchd/cron (non-login shell).
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi

# Extra unique visitors for homepage_revamp_test (purchase + fitting where available).
# SIM_EXPERIMENT_USERS is per platform (desktop/android/ios); default 100 → ~300 total.
# ~25% are returning personas with a reused Statsig stableID across runs (scoped per platform).
export SIM_EXPERIMENT_USERS="${SIM_EXPERIMENT_USERS:-100}"
export VITE_STATSIG_TIER="${VITE_STATSIG_TIER:-production}"
# Force a dedicated Vite server on 5180 with production Statsig tier (see playwright.config.ts).
export CI="${CI:-true}"
export PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-5180}"

LOG_DIR="$REPO_ROOT/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/daily-simulation.log"

{
  echo ""
  echo "===== $(date '+%Y-%m-%d %H:%M:%S %z') (system) ====="
  echo "===== $(TZ=America/Los_Angeles date '+%Y-%m-%d %H:%M:%S %Z') (America/Los_Angeles) ====="
  echo "cwd: $REPO_ROOT"
  echo "SIM_EXPERIMENT_USERS=${SIM_EXPERIMENT_USERS} (per platform: desktop/android/ios)"
} >>"$LOG_FILE"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Add Node to PATH for non-interactive runs (e.g. Homebrew or nvm)." >>"$LOG_FILE"
  exit 127
fi

set +e
npm run simulate-customers >>"$LOG_FILE" 2>&1
exit_code=$?
set -e

echo "Exit code: ${exit_code}" >>"$LOG_FILE"
exit "${exit_code}"
