#!/usr/bin/env python3
"""
Trading Bot — Main Entry Point

Usage:
  python3.12 main.py NVDA              # Research a single stock
  python3.12 main.py NVDA AAPL TSLA   # Research multiple stocks
  python3.12 main.py --no-email NVDA  # Run without sending email (saves to file)
"""
import sys
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from data.stock_data import get_stock_overview, get_price_history, get_financials
from data.sec_data import get_sec_summary
from data.youtube_data import get_all_recent_content, search_youtube_for_ticker
from data.congress_data import get_congress_trades
from research.engine import run_pipeline
from utils.email import send_report


def fetch_all_data(ticker: str) -> dict:
    print(f"  Fetching stock data...")
    overview = get_stock_overview(ticker)
    price_history = get_price_history(ticker)
    financials = get_financials(ticker)

    print(f"  Fetching SEC filings...")
    sec_data = get_sec_summary(ticker)

    print(f"  Fetching YouTube content...")
    youtube_data = search_youtube_for_ticker(ticker, max_results=5)

    print(f"  Fetching congressional trades...")
    congress_data = get_congress_trades(ticker)

    return {
        "stock": {
            "overview": overview,
            "price_history": price_history,
            "financials": financials,
        },
        "sec": sec_data,
        "youtube": youtube_data,
        "congress": congress_data,
    }


def save_report(report: dict, ticker: str):
    os.makedirs("reports", exist_ok=True)
    os.makedirs("reports/archive", exist_ok=True)
    date = datetime.now().strftime("%Y-%m-%d")
    new_path = f"reports/{ticker}_{date}.json"

    # Archive any prior reports for this ticker so the dashboard shows only the latest.
    for f in os.listdir("reports"):
        if not f.endswith(".json"):
            continue
        if not f.upper().startswith(f"{ticker.upper()}_"):
            continue
        src = f"reports/{f}"
        if os.path.abspath(src) == os.path.abspath(new_path):
            continue
        os.replace(src, f"reports/archive/{f}")

    with open(new_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"  Report saved to {new_path}")


def research_ticker(ticker: str, send_email: bool = True):
    ticker = ticker.upper()
    print(f"\n{'='*50}")
    print(f"Researching {ticker}...")
    print(f"{'='*50}")

    print("\n[Data Collection]")
    data = fetch_all_data(ticker)

    print("\n[Research Pipeline]")
    report = run_pipeline(
        ticker=ticker,
        stock_data=data["stock"],
        sec_data=data["sec"],
        youtube_data=data["youtube"],
        congress_data=data["congress"],
    )

    save_report(report, ticker)

    if send_email:
        print("\n[Email Delivery]")
        send_report(report)

    verdict = report.get("verdict", {})
    trade = report.get("trade_setup", {})
    print(f"\n{'='*50}")
    print(f"VERDICT: {verdict.get('net_verdict', 'N/A').replace('_',' ').upper()} (conviction: {verdict.get('conviction_score','N/A')}/10)")
    print(f"Entry: ${trade.get('entry_zone',{}).get('low','?')} – ${trade.get('entry_zone',{}).get('high','?')}")
    print(f"Stop:  ${trade.get('stop_loss',{}).get('price','?')}")
    print(f"R/R:   {trade.get('risk_reward_ratio','N/A')}")
    print(f"{'='*50}\n")

    return report


def main():
    args = sys.argv[1:]

    if not args:
        print("Usage: python3.12 main.py TICKER [TICKER2 ...] [--no-email]")
        sys.exit(1)

    send_email = "--no-email" not in args
    tickers = [a for a in args if not a.startswith("--")]

    if not tickers:
        print("Error: No tickers provided.")
        sys.exit(1)

    for ticker in tickers:
        research_ticker(ticker, send_email=send_email)


if __name__ == "__main__":
    main()
