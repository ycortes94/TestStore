#!/usr/bin/env bash
# Installs a LaunchAgent that runs scripts/run-daily-simulation.sh every day at
# 8:00 AM, 2:00 PM, and 8:00 PM in the Mac's system time zone
# (set System Settings → Date & Time → Los Angeles for Pacific).
# Run once from the repo: bash scripts/install-macos-launchagent.sh
# Uninstall: bash scripts/uninstall-macos-launchagent.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="$REPO_ROOT/scripts/run-daily-simulation.sh"
LABEL="com.teststore.daily-customer-simulation"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

chmod +x "$RUNNER"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$REPO_ROOT/logs"

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${RUNNER}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Hour</key>
      <integer>8</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <dict>
      <key>Hour</key>
      <integer>14</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <dict>
      <key>Hour</key>
      <integer>20</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
  </array>
  <key>StandardOutPath</key>
  <string>${REPO_ROOT}/logs/launchd-stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${REPO_ROOT}/logs/launchd-stderr.log</string>
</dict>
</plist>
EOF

# Reload job if it was already loaded
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"

echo "Installed LaunchAgent: $PLIST"
echo "Schedule: every day at 08:00, 14:00, and 20:00 local time. For Pacific Time, set the Mac timezone to Los Angeles."
echo "Verify: launchctl print \"gui/$(id -u)/${LABEL}\""
echo "Logs: $REPO_ROOT/logs/daily-simulation.log"
echo "Test run now: bash scripts/run-daily-simulation.sh"
