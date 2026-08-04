#!/usr/bin/env bash
# Removes the daily simulation LaunchAgent installed by install-macos-launchagent.sh

set -euo pipefail

LABEL="com.teststore.daily-customer-simulation"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Removed LaunchAgent (if it was loaded): $PLIST"
