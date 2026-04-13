#!/bin/bash
# Install/uninstall the Trading Bot scheduler on macOS via launchd
#
# Usage:
#   ./install.sh          # Install and start
#   ./install.sh start    # Install and start
#   ./install.sh stop     # Stop and uninstall
#   ./install.sh status   # Check if running

PLIST_NAME="com.tradingbot.scheduler"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/${PLIST_NAME}.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

case "${1:-start}" in
  start)
    echo "Installing scheduler..."
    cp "$PLIST_SRC" "$PLIST_DEST"
    launchctl load "$PLIST_DEST"
    echo "Scheduler installed. Runs every 60 minutes."
    echo "Logs: $(dirname "$0")/scheduler.log"
    ;;
  stop)
    echo "Stopping scheduler..."
    launchctl unload "$PLIST_DEST" 2>/dev/null
    rm -f "$PLIST_DEST"
    echo "Scheduler stopped and uninstalled."
    ;;
  status)
    if launchctl list | grep -q "$PLIST_NAME"; then
      echo "Scheduler is running."
    else
      echo "Scheduler is not running."
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
