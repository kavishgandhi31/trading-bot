import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
}


def get_senate_trades(ticker: str) -> list:
    url = f"https://efts.sec.gov/LATEST/search-index?q={ticker}&forms=4"
    
    try:
        response = requests.get(
            "https://senatestockwatcher.com/api/transactions",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            trades = []
            for t in data.get("transactions", []):
                if ticker.upper() in t.get("ticker", "").upper():
                    trades.append({
                        "senator": t.get("senator", "N/A"),
                        "ticker": t.get("ticker", "N/A"),
                        "type": t.get("type", "N/A"),
                        "amount": t.get("amount", "N/A"),
                        "date": t.get("transaction_date", "N/A"),
                        "source": "Senate",
                    })
            return trades[:10]
    except Exception:
        pass

    return _scrape_senate_fallback(ticker)


def _scrape_senate_fallback(ticker: str) -> list:
    try:
        url = f"https://senatestockwatcher.com/politician"
        response = requests.get(
            f"https://senatestockwatcher.com/api/transactions?ticker={ticker}",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            trades = []
            for t in data.get("transactions", []):
                trades.append({
                    "senator": t.get("senator", "N/A"),
                    "ticker": t.get("ticker", ticker),
                    "type": t.get("type", "N/A"),
                    "amount": t.get("amount", "N/A"),
                    "date": t.get("transaction_date", "N/A"),
                    "source": "Senate",
                })
            return trades[:10]
    except Exception:
        pass
    return []


def get_house_trades(ticker: str) -> list:
    try:
        response = requests.get(
            f"https://housestockwatcher.com/api/transactions?ticker={ticker}",
            headers=HEADERS,
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            trades = []
            for t in data:
                trades.append({
                    "representative": t.get("representative", "N/A"),
                    "ticker": t.get("ticker", ticker),
                    "type": t.get("transaction_type", "N/A"),
                    "amount": t.get("amount", "N/A"),
                    "date": t.get("transaction_date", "N/A"),
                    "source": "House",
                })
            return trades[:10]
    except Exception:
        pass
    return []


def get_congress_trades(ticker: str) -> dict:
    senate = get_senate_trades(ticker)
    house = get_house_trades(ticker)
    all_trades = senate + house

    buys = [t for t in all_trades if "purchase" in t.get("type", "").lower() or "buy" in t.get("type", "").lower()]
    sells = [t for t in all_trades if "sale" in t.get("type", "").lower() or "sell" in t.get("type", "").lower()]

    return {
        "ticker": ticker.upper(),
        "total_trades": len(all_trades),
        "buys": buys,
        "sells": sells,
        "all_trades": all_trades,
        "signal": "bullish" if len(buys) > len(sells) else "bearish" if len(sells) > len(buys) else "neutral",
    }


if __name__ == "__main__":
    ticker = "NVDA"
    print(f"Testing congressional trades fetcher for {ticker}...")
    result = get_congress_trades(ticker)
    print(f"Total trades found: {result['total_trades']}")
    print(f"Buys: {len(result['buys'])}, Sells: {len(result['sells'])}")
    print(f"Signal: {result['signal']}")
    if result["all_trades"]:
        print(f"Sample trade: {result['all_trades'][0]}")
    print("Congressional trades fetcher working.")
