#!/usr/bin/env bash
# Best-effort: ask macOS to wake a few minutes before each simulation run.
# Requires your admin password (sudo). Does NOT reliably wake a closed-lid MacBook.
#
# Prefer GitHub Actions for true unattended 8 AM runs (see
# .github/workflows/daily-customer-simulation.yml) — that runs in the cloud
# whether this laptop is asleep or not.
#
# Usage:
#   bash scripts/schedule-macos-wakes.sh          # install wake schedule
#   bash scripts/schedule-macos-wakes.sh clear    # remove wake schedule

set -euo pipefail

if [[ "${1:-}" == "clear" ]]; then
  sudo pmset repeat cancel
  echo "Cleared pmset repeating wake schedule."
  pmset -g sched || true
  exit 0
fi

# Wake ~5 minutes before 08:00, 09:30, 14:00, 17:00, and 20:00 local time, every day.
# pmset only supports one repeating schedule, so we use the earliest morning wake
# and rely on the machine staying awake (or Power Adapter “Prevent sleeping”) for later runs.
# For multiple wakes, schedule one-off wakes for the next few days or use GitHub Actions.
sudo pmset repeat wakeorpoweron MTWRFSU 07:55:00

echo "Installed repeating wake: every day at 07:55 local time (before the 08:00 simulation)."
echo ""
echo "Also enable (System Settings → Battery / Energy):"
echo "  • Prevent automatic sleeping on power adapter when the display is off"
echo ""
echo "Closed-lid MacBooks often will NOT run LaunchAgents until you open them."
echo "For guaranteed morning runs while you're away, use GitHub Actions on the default branch."
echo ""
pmset -g sched || true
