import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta


def get_stock_overview(ticker: str) -> dict:
    stock = yf.Ticker(ticker)
    info = stock.info

    return {
        "ticker": ticker.upper(),
        "name": info.get("longName", "N/A"),
        "sector": info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "market_cap": info.get("marketCap", "N/A"),
        "current_price": info.get("currentPrice") or info.get("regularMarketPrice", "N/A"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh", "N/A"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow", "N/A"),
        "avg_volume": info.get("averageVolume", "N/A"),
        "pe_ratio": info.get("trailingPE", "N/A"),
        "forward_pe": info.get("forwardPE", "N/A"),
        "ps_ratio": info.get("priceToSalesTrailing12Months", "N/A"),
        "pb_ratio": info.get("priceToBook", "N/A"),
        "ev_ebitda": info.get("enterpriseToEbitda", "N/A"),
        "gross_margin": info.get("grossMargins", "N/A"),
        "revenue_growth": info.get("revenueGrowth", "N/A"),
        "earnings_growth": info.get("earningsGrowth", "N/A"),
        "total_revenue": info.get("totalRevenue", "N/A"),
        "ebitda": info.get("ebitda", "N/A"),
        "total_debt": info.get("totalDebt", "N/A"),
        "free_cashflow": info.get("freeCashflow", "N/A"),
        "insider_ownership": info.get("heldPercentInsiders", "N/A"),
        "institutional_ownership": info.get("heldPercentInstitutions", "N/A"),
        "short_ratio": info.get("shortRatio", "N/A"),
        "short_percent_float": info.get("shortPercentOfFloat", "N/A"),
        "analyst_target_price": info.get("targetMeanPrice", "N/A"),
        "recommendation": info.get("recommendationKey", "N/A"),
        "beta": info.get("beta", "N/A"),
        "description": info.get("longBusinessSummary", "N/A"),
    }


def get_price_history(ticker: str, period: str = "1y") -> dict:
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if hist.empty:
        return {}

    sma_20 = hist["Close"].rolling(window=20).mean().iloc[-1]
    sma_100 = hist["Close"].rolling(window=100).mean().iloc[-1]
    sma_200 = hist["Close"].rolling(window=200).mean().iloc[-1]
    current = hist["Close"].iloc[-1]

    golden_cross = None
    death_cross = None
    sma_50 = hist["Close"].rolling(window=50).mean()
    sma_200_series = hist["Close"].rolling(window=200).mean()
    for i in range(1, min(30, len(hist))):
        if sma_50.iloc[-i] > sma_200_series.iloc[-i] and sma_50.iloc[-i-1] <= sma_200_series.iloc[-i-1]:
            golden_cross = hist.index[-i].strftime("%Y-%m-%d")
            break
        elif sma_50.iloc[-i] < sma_200_series.iloc[-i] and sma_50.iloc[-i-1] >= sma_200_series.iloc[-i-1]:
            death_cross = hist.index[-i].strftime("%Y-%m-%d")
            break

    return {
        "current_price": round(current, 2),
        "sma_20": round(sma_20, 2) if pd.notna(sma_20) else "N/A",
        "sma_100": round(sma_100, 2) if pd.notna(sma_100) else "N/A",
        "sma_200": round(sma_200, 2) if pd.notna(sma_200) else "N/A",
        "above_sma_200": bool(current > sma_200) if pd.notna(sma_200) else "N/A",
        "golden_cross_recent": golden_cross,
        "death_cross_recent": death_cross,
        "52w_high": round(hist["High"].max(), 2),
        "52w_low": round(hist["Low"].min(), 2),
        "avg_volume_30d": int(hist["Volume"].tail(30).mean()),
        "price_history_6m": hist["Close"].tail(180).to_dict(),
    }


def get_financials(ticker: str) -> dict:
    stock = yf.Ticker(ticker)

    try:
        income = stock.financials
        quarterly = stock.quarterly_financials
    except Exception:
        return {}

    result = {}

    if not income.empty:
        revenues = income.loc["Total Revenue"] if "Total Revenue" in income.index else None
        if revenues is not None:
            result["annual_revenue"] = {
                str(col.date()): int(val) for col, val in revenues.items() if pd.notna(val)
            }

    if not quarterly.empty:
        q_revenue = quarterly.loc["Total Revenue"] if "Total Revenue" in quarterly.index else None
        if q_revenue is not None:
            result["quarterly_revenue"] = {
                str(col.date()): int(val) for col, val in q_revenue.items() if pd.notna(val)
            }

    return result


if __name__ == "__main__":
    ticker = "AAPL"
    print("Testing stock data fetcher...")
    overview = get_stock_overview(ticker)
    print(f"Company: {overview['name']}")
    print(f"Current Price: ${overview['current_price']}")
    print(f"Sector: {overview['sector']}")
    print(f"P/S Ratio: {overview['ps_ratio']}")
    print(f"Revenue Growth: {overview['revenue_growth']}")

    price = get_price_history(ticker)
    print(f"Above 200-day MA: {price['above_sma_200']}")
    print(f"52w High: ${price['52w_high']}, Low: ${price['52w_low']}")
    print("Data fetcher working.")
