#!/usr/bin/env python3
"""
Email an already-generated report without re-running the pipeline.

Usage:
  python3.12 send_existing.py NVDA_2026-05-03
"""
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from utils.email import send_report

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3.12 send_existing.py SLUG")
        sys.exit(1)

    slug = sys.argv[1]
    path = os.path.join(REPORTS_DIR, f"{slug}.json")

    if not os.path.exists(path):
        print(f"Report not found: {path}")
        sys.exit(1)

    with open(path) as f:
        report = json.load(f)

    ok = send_report(report)
    sys.exit(0 if ok else 2)


if __name__ == "__main__":
    main()
