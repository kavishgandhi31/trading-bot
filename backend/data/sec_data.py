import requests
from bs4 import BeautifulSoup
import time


HEADERS = {
    "User-Agent": "trading-bot research@tradingbot.com",
    "Accept-Encoding": "gzip, deflate",
}


def get_cik(ticker: str) -> str | None:
    url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&dateRange=custom&startdt=2020-01-01&enddt=2030-01-01&forms=10-K"
    lookup_url = f"https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK={ticker}&type=10-K&dateb=&owner=include&count=5&search_text=&action=getcompany"
    
    response = requests.get(lookup_url, headers=HEADERS)
    soup = BeautifulSoup(response.text, "html.parser")
    
    cik_tag = soup.find("a", href=lambda h: h and "/cgi-bin/browse-edgar?action=getcompany&CIK=" in h)
    if cik_tag:
        href = cik_tag["href"]
        cik = href.split("CIK=")[1].split("&")[0]
        return cik.zfill(10)
    return None


def get_readable_filing_url(cik: str, accession: str) -> str | None:
    """Get the human-readable HTM document URL from the filing index."""
    acc_clean = accession.replace("-", "")
    index_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_clean}/{accession}-index.htm"
    try:
        response = requests.get(index_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        for link in soup.find_all("a", href=True):
            href = link["href"]
            if href.endswith(".htm") and not href.endswith("-index.htm"):
                return f"https://www.sec.gov{href}" if href.startswith("/") else href
    except Exception:
        pass
    return None


def get_recent_filings(ticker: str, filing_types: list = ["10-K", "10-Q", "8-K"]) -> list:
    cik = get_cik(ticker)
    if not cik:
        return []

    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    response = requests.get(url, headers=HEADERS)

    if response.status_code != 200:
        return []

    data = response.json()
    filings = data.get("filings", {}).get("recent", {})

    forms = filings.get("form", [])
    dates = filings.get("filingDate", [])
    accession = filings.get("accessionNumber", [])

    results = []
    for i, form in enumerate(forms):
        if form in filing_types:
            readable_url = get_readable_filing_url(cik, accession[i])
            acc_clean = accession[i].replace("-", "")
            fallback_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_clean}/"
            results.append({
                "type": form,
                "date": dates[i],
                "url": readable_url or fallback_url,
                "accession": accession[i],
            })
        if len(results) >= 10:
            break

    return results


def get_insider_trades(ticker: str) -> list:
    cik = get_cik(ticker)
    if not cik:
        return []

    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    response = requests.get(url, headers=HEADERS)

    if response.status_code != 200:
        return []

    data = response.json()
    filings = data.get("filings", {}).get("recent", {})

    forms = filings.get("form", [])
    dates = filings.get("filingDate", [])
    accession = filings.get("accessionNumber", [])

    trades = []
    for i, form in enumerate(forms):
        if form == "4":
            trades.append({
                "type": "Form 4 (Insider Trade)",
                "date": dates[i],
                "accession": accession[i],
                "url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type=4&dateb=&owner=include&count=10",
            })
        if len(trades) >= 5:
            break

    return trades


def get_filing_text(url: str, max_chars: int = 8000) -> str:
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "table"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 40]
        return "\n".join(lines)[:max_chars]
    except Exception as e:
        return f"Could not fetch filing: {e}"


def get_sec_summary(ticker: str) -> dict:
    filings = get_recent_filings(ticker)
    insider_trades = get_insider_trades(ticker)

    latest_10k = next((f for f in filings if f["type"] == "10-K"), None)
    latest_10q = next((f for f in filings if f["type"] == "10-Q"), None)
    recent_8k = [f for f in filings if f["type"] == "8-K"][:3]

    result = {
        "ticker": ticker.upper(),
        "latest_10k": latest_10k,
        "latest_10q": latest_10q,
        "recent_8k": recent_8k,
        "recent_insider_trades": insider_trades[:5],
        "filing_count": len(filings),
    }

    if latest_10k:
        time.sleep(0.5)
        result["10k_excerpt"] = get_filing_text(latest_10k["url"])

    return result


if __name__ == "__main__":
    ticker = "AAPL"
    print(f"Testing SEC EDGAR fetcher for {ticker}...")
    summary = get_sec_summary(ticker)
    print(f"Latest 10-K: {summary['latest_10k']['date'] if summary['latest_10k'] else 'Not found'}")
    print(f"Latest 10-Q: {summary['latest_10q']['date'] if summary['latest_10q'] else 'Not found'}")
    print(f"Recent 8-Ks: {len(summary['recent_8k'])}")
    print(f"Insider trades: {len(summary['recent_insider_trades'])}")
    print(f"10-K excerpt (first 300 chars): {summary.get('10k_excerpt', '')[:300]}")
    print("SEC fetcher working.")
