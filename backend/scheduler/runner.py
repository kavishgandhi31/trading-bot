#!/usr/bin/env python3
"""
Scheduler Runner — checks which schedules are due and runs them.

Called periodically by launchd (or cron). Only processes tickers
the user has explicitly enabled from the dashboard.

Usage:
  python3.12 scheduler/runner.py          # Run all due schedules
  python3.12 scheduler/runner.py --force  # Run all enabled schedules regardless of timing
"""
import sys
import os

# Ensure backend/ is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.chdir(os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from scheduler.store import list_schedules, mark_ran
from main import research_ticker

FREQUENCY_INTERVALS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
    "biweekly": timedelta(weeks=2),
    "monthly": timedelta(days=30),
}


def is_due(schedule: dict, now: datetime) -> bool:
    if not schedule.get("enabled"):
        return False

    last_run = schedule.get("last_run")
    if not last_run:
        return True  # Never run before — due immediately

    interval = FREQUENCY_INTERVALS.get(schedule["frequency"], timedelta(days=1))
    last_dt = datetime.fromisoformat(last_run)
    return now >= last_dt + interval


def run_due_schedules(force: bool = False):
    schedules = list_schedules()
    now = datetime.now()

    if not schedules:
        print("No schedules configured. Add tickers from the dashboard.")
        return

    enabled = [s for s in schedules if s.get("enabled")]
    if not enabled:
        print("All schedules are disabled.")
        return

    due = enabled if force else [s for s in enabled if is_due(s, now)]

    if not due:
        print(f"[{now.strftime('%Y-%m-%d %H:%M')}] No schedules due. Next check will re-evaluate.")
        return

    print(f"[{now.strftime('%Y-%m-%d %H:%M')}] {len(due)} schedule(s) due: {', '.join(s['ticker'] for s in due)}")

    for schedule in due:
        ticker = schedule["ticker"]
        send_email = schedule.get("send_email", True)

        try:
            print(f"\n--- Running {ticker} (frequency: {schedule['frequency']}) ---")
            research_ticker(ticker, send_email=send_email)
            mark_ran(schedule["id"])
            print(f"--- {ticker} complete, marked as ran ---")
        except Exception as e:
            print(f"--- {ticker} FAILED: {e} ---")


if __name__ == "__main__":
    force = "--force" in sys.argv
    run_due_schedules(force=force)
