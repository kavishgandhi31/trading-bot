"""
Prompt builders for each stage of the research pipeline.
Each function takes a data dict and returns a prompt string for Claude.
"""


def macro_screen_prompt(ticker: str, overview: dict) -> str:
    return f"""You are a macro-aware equity analyst. Assess the current macro and sector context for {ticker}.

Company: {overview.get('name', ticker)}
Sector: {overview.get('sector', 'N/A')}
Industry: {overview.get('industry', 'N/A')}

Using your knowledge of current market conditions (interest rates, sector rotation, geopolitical risks, economic indicators), answer:
1. Is this sector currently in favor or out of favor with institutional investors? Why?
2. What macro tailwinds or headwinds directly affect this company?
3. What geopolitical or regulatory risks are relevant to this sector right now?
4. Which official sources should be monitored for this specific stock (e.g. FDA for biotech, Pentagon contracts for defense, FOMC for banks)?

Be specific and data-grounded. Flag any sector-specific risks that are often overlooked.

Return a JSON object:
{{
  "sector_sentiment": "bullish|bearish|neutral",
  "macro_tailwinds": ["..."],
  "macro_headwinds": ["..."],
  "geopolitical_risks": ["..."],
  "sources_to_monitor": ["..."],
  "macro_summary": "2-3 sentence summary"
}}"""


def research_foundation_prompt(ticker: str, overview: dict, sec_summary: dict, financials: dict) -> str:
    filings_info = ""
    if sec_summary.get("latest_10k"):
        filings_info += f"Latest 10-K filed: {sec_summary['latest_10k']['date']}\n"
    if sec_summary.get("10k_excerpt"):
        filings_info += f"10-K excerpt:\n{sec_summary['10k_excerpt'][:3000]}\n"

    return f"""You are a senior equity analyst conducting deep research on {ticker}.

COMPANY DATA:
Name: {overview.get('name', ticker)}
Sector: {overview.get('sector', 'N/A')} | Industry: {overview.get('industry', 'N/A')}
Market Cap: ${overview.get('market_cap', 'N/A'):,} 
Description: {overview.get('description', 'N/A')[:1000]}

SEC FILINGS:
{filings_info if filings_info else 'No filing data available.'}

Conduct a comprehensive research foundation covering ALL 4 areas:

1. BUSINESS MODEL: How exactly does {ticker} make money? What are the revenue streams? Is the model recurring or transactional?

2. MOAT & COMPETITION: Who are the top 3 competitors? Does {ticker} have a genuine technological, patent, network, or cost advantage that competitors lack? Be specific — what would it take for a competitor to replicate their edge?

3. CATALYSTS: What are the top 3 upcoming catalysts in the next 12 months (product launches, regulatory approvals, partnerships, earnings milestones)? Rate each: Critical / High / Strategic.

4. ASYMMETRY CHECK: Is there a low valuation floor vs high growth ceiling? Where is the asymmetry? If there is none, say so directly.

Return a JSON object:
{{
  "business_model": {{
    "summary": "...",
    "revenue_streams": ["..."],
    "model_type": "recurring|transactional|mixed"
  }},
  "moat": {{
    "has_moat": true/false,
    "moat_type": "...",
    "competitive_advantage": "...",
    "top_competitors": ["..."],
    "competitor_threat_level": "low|medium|high"
  }},
  "catalysts": [
    {{"catalyst": "...", "timeline": "...", "rating": "Critical|High|Strategic", "impact": "..."}}
  ],
  "asymmetry": {{
    "exists": true/false,
    "downside_floor": "...",
    "upside_ceiling": "...",
    "asymmetry_summary": "..."
  }},
  "foundation_score": 1-10,
  "foundation_summary": "3-4 sentence summary"
}}"""


def valuation_prompt(ticker: str, overview: dict, financials: dict, price_history: dict) -> str:
    return f"""You are a quantitative analyst evaluating the valuation of {ticker}.

MARKET DATA:
Current Price: ${overview.get('current_price', 'N/A')}
Market Cap: ${overview.get('market_cap', 'N/A')}
P/S Ratio (TTM): {overview.get('ps_ratio', 'N/A')}
P/E Ratio (TTM): {overview.get('pe_ratio', 'N/A')}
Forward P/E: {overview.get('forward_pe', 'N/A')}
EV/EBITDA: {overview.get('ev_ebitda', 'N/A')}
Gross Margin: {overview.get('gross_margin', 'N/A')}
Revenue Growth (YoY): {overview.get('revenue_growth', 'N/A')}
Earnings Growth: {overview.get('earnings_growth', 'N/A')}
Total Revenue: ${overview.get('total_revenue', 'N/A')}
EBITDA: {overview.get('ebitda', 'N/A')}
Free Cash Flow: {overview.get('free_cashflow', 'N/A')}
Insider Ownership: {overview.get('insider_ownership', 'N/A')}
Institutional Ownership: {overview.get('institutional_ownership', 'N/A')}
Beta: {overview.get('beta', 'N/A')}
Analyst Target Price: ${overview.get('analyst_target_price', 'N/A')}
Analyst Recommendation: {overview.get('recommendation', 'N/A')}

52-Week High: ${price_history.get('52w_high', 'N/A')} | Low: ${price_history.get('52w_low', 'N/A')}

Conduct full valuation analysis:

1. PEER COMPARISON: Compare {ticker}'s P/S, EV/EBITDA, gross margin, and revenue growth to what you know about its top 2-3 sector peers. Calculate Value/Growth Score (P/S TTM / revenue growth %). Lower = more growth per valuation dollar.

2. RULE OF 40: Calculate Revenue Growth % + EBITDA Margin %. Is {ticker} above or below 40? What is the trajectory?

3. HISTORICAL CONTEXT: Based on typical valuation ranges for this sector and company history, where does the current multiple sit — compressed, fair, or elevated?

4. INSIDER ALIGNMENT: Insider ownership at {overview.get('insider_ownership', 'N/A')} — is management aligned with shareholders? Compare to sector average.

5. DILUTION RISK: Based on available data, any known secondary offerings, ATM programs, or heavy stock-based compensation to flag?

Return a JSON object:
{{
  "peer_comparison": {{
    "value_growth_score": "...",
    "relative_valuation": "cheap|fair|expensive",
    "peer_summary": "..."
  }},
  "rule_of_40": {{
    "score": "...",
    "above_40": true/false,
    "trajectory": "improving|declining|stable"
  }},
  "historical_context": {{
    "current_vs_history": "compressed|fair|elevated",
    "context_summary": "..."
  }},
  "insider_alignment": {{
    "ownership_pct": "...",
    "aligned": true/false,
    "notes": "..."
  }},
  "dilution_risk": {{
    "risk_level": "low|medium|high",
    "notes": "..."
  }},
  "valuation_score": 1-10,
  "valuation_summary": "3-4 sentence summary"
}}"""


def risk_prompt(ticker: str, overview: dict, sec_summary: dict, youtube_content: list) -> str:
    yt_mentions = ""
    if youtube_content:
        relevant = [v for v in youtube_content if ticker.upper() in v.get('title', '').upper() or ticker.upper() in v.get('description', '').upper()][:3]
        if relevant:
            yt_mentions = "RELEVANT YOUTUBE CONTENT:\n"
            for v in relevant:
                yt_mentions += f"- [{v['channel']}] {v['title']}\n  {v['description'][:200]}\n"

    filing_excerpt = sec_summary.get("10k_excerpt", "")[:2000] if sec_summary else ""

    return f"""You are a skeptical short-seller stress-testing the bear case for {ticker}.

COMPANY: {overview.get('name', ticker)} | Sector: {overview.get('sector', 'N/A')}
Short Interest (% float): {overview.get('short_percent_float', 'N/A')}
Short Ratio: {overview.get('short_ratio', 'N/A')}

10-K EXCERPT:
{filing_excerpt if filing_excerpt else 'Not available.'}

{yt_mentions}

Conduct a full risk and red-teaming analysis:

1. SKEPTIC ASSESSMENT: Write a 3-point risk assessment focusing on accounting irregularities, customer concentration, and competitive threats. Be specific — use filing data where available.

2. SHORT REPORT: Act as a short seller. What is the 3-point bear thesis? What would need to be true for the stock to drop 40%+?

3. SEC FILING RISKS: From the 10-K excerpt, identify the top 3 most company-specific (non-boilerplate) risk factors. Skip generic risks like "we face competition."

4. DILUTION & CONCENTRATION: Any customer concentration above 20% of revenue? Any dilution mechanisms (ATM, convertibles, warrants)?

5. BULL CASE CRITIQUE: What is the market likely discounting even if the bull thesis sounds compelling? Why might smart money be cautious?

6. LAST EARNINGS MISS: Based on your knowledge, when did {ticker} last miss earnings and what was the reason?

Return a JSON object:
{{
  "skeptic_risks": [
    {{"risk": "...", "severity": "Critical|High|Medium", "detail": "..."}}
  ],
  "short_thesis": {{
    "bear_case": "...",
    "key_points": ["..."],
    "downside_scenario": "..."
  }},
  "sec_risk_factors": ["..."],
  "concentration_dilution": {{
    "customer_concentration": "...",
    "dilution_risk": "..."
  }},
  "bull_case_critique": "...",
  "last_earnings_miss": {{
    "date": "...",
    "reason": "...",
    "stock_reaction": "..."
  }},
  "risk_score": 1-10,
  "risk_summary": "3-4 sentence summary"
}}"""


def technicals_prompt(ticker: str, price_history: dict, overview: dict) -> str:
    return f"""You are a technical analyst evaluating the chart setup for {ticker}.

PRICE DATA:
Current Price: ${price_history.get('current_price', 'N/A')}
20-day SMA: ${price_history.get('sma_20', 'N/A')}
100-day SMA: ${price_history.get('sma_100', 'N/A')}
200-day SMA: ${price_history.get('sma_200', 'N/A')}
Above 200-day MA: {price_history.get('above_sma_200', 'N/A')}
Golden Cross (recent): {price_history.get('golden_cross_recent', 'None detected')}
Death Cross (recent): {price_history.get('death_cross_recent', 'None detected')}
52-Week High: ${price_history.get('52w_high', 'N/A')}
52-Week Low: ${price_history.get('52w_low', 'N/A')}
Avg Volume (30d): {price_history.get('avg_volume_30d', 'N/A')}
Short Interest (% float): {overview.get('short_percent_float', 'N/A')}
Short Ratio (days to cover): {overview.get('short_ratio', 'N/A')}
Beta: {overview.get('beta', 'N/A')}

Conduct technical analysis:

1. KEY PRICE LEVELS: Identify immediate resistance (52w high, swing highs, analyst targets) and support (SMA levels, prior bases). What is the most important level to watch right now?

2. MOVING AVERAGE STATUS: Price relative to 20/100/200-day SMAs. What does the MA structure say about trend health? Any recent Golden Cross or Death Cross?

3. RELATIVE STRENGTH: Based on beta and recent price action vs the broader market, is {ticker} showing relative strength or weakness?

4. SHORT INTEREST: Short interest at {overview.get('short_percent_float', 'N/A')} of float with {overview.get('short_ratio', 'N/A')} days to cover. Squeeze potential? Rising or falling?

5. VOLATILITY & SENTIMENT: Given beta of {overview.get('beta', 'N/A')}, what is the expected price range on a market move? Is retail sentiment likely bullish, mixed, or fearful at current levels?

Return a JSON object:
{{
  "key_levels": {{
    "immediate_resistance": ["..."],
    "immediate_support": ["..."],
    "most_important_level": "..."
  }},
  "moving_averages": {{
    "trend": "uptrend|downtrend|sideways",
    "ma_structure": "bullish|bearish|mixed",
    "notes": "..."
  }},
  "relative_strength": {{
    "vs_market": "outperforming|underperforming|inline",
    "notes": "..."
  }},
  "short_interest": {{
    "squeeze_potential": "low|medium|high",
    "trend": "rising|falling|stable",
    "notes": "..."
  }},
  "sentiment": "bullish|bearish|mixed",
  "technicals_score": 1-10,
  "technicals_summary": "3-4 sentence summary"
}}"""


def bull_bear_verdict_prompt(ticker: str, foundation: dict, valuation: dict, risk: dict, technicals: dict, macro: dict) -> str:
    return f"""You are a senior portfolio manager delivering a final investment verdict on {ticker}.

RESEARCH SUMMARY:
Macro: {macro.get('macro_summary', 'N/A')} | Sector: {macro.get('sector_sentiment', 'N/A')}
Foundation Score: {foundation.get('foundation_score', 'N/A')}/10 — {foundation.get('foundation_summary', 'N/A')}
Valuation Score: {valuation.get('valuation_score', 'N/A')}/10 — {valuation.get('valuation_summary', 'N/A')}
Risk Score: {risk.get('risk_score', 'N/A')}/10 — {risk.get('risk_summary', 'N/A')}
Technicals Score: {technicals.get('technicals_score', 'N/A')}/10 — {technicals.get('technicals_summary', 'N/A')}

KEY BULL FACTORS:
- Moat: {foundation.get('moat', {}).get('competitive_advantage', 'N/A')}
- Top Catalyst: {foundation.get('catalysts', [{}])[0].get('catalyst', 'N/A') if foundation.get('catalysts') else 'N/A'}
- Valuation: {valuation.get('peer_comparison', {}).get('relative_valuation', 'N/A')}
- Technical trend: {technicals.get('moving_averages', {}).get('trend', 'N/A')}

KEY BEAR FACTORS:
- Top Risk: {risk.get('skeptic_risks', [{}])[0].get('risk', 'N/A') if risk.get('skeptic_risks') else 'N/A'}
- Short thesis: {risk.get('short_thesis', {}).get('bear_case', 'N/A')}
- Bull case critique: {risk.get('bull_case_critique', 'N/A')}

Now deliver a structured verdict:

1. BULL SYNTHESIS: Make the strongest possible case FOR buying {ticker}. Use the research above. Be specific about what needs to play out.

2. BEAR SYNTHESIS: Make the strongest possible case AGAINST buying {ticker}. Be equally rigorous.

3. FINAL VERDICT: Where does the weight of evidence land? Be direct — do not hedge everything. Give a net view.

4. CONVICTION SCORE: 1-10 (1 = strong sell, 5 = neutral, 10 = strong buy)

5. THESIS KILLERS: What 2-3 specific data points or events would completely invalidate the bull case?

Return a JSON object:
{{
  "bull_synthesis": "...",
  "bear_synthesis": "...",
  "net_verdict": "strong_buy|buy|hold|sell|strong_sell",
  "verdict_rationale": "...",
  "conviction_score": 1-10,
  "thesis_killers": ["..."],
  "verdict_summary": "3-4 sentence summary"
}}"""


def trade_setup_prompt(ticker: str, price_history: dict, overview: dict, verdict: dict, foundation: dict) -> str:
    return f"""You are a risk manager defining the trade parameters for {ticker}.

PRICE LEVELS:
Current Price: ${price_history.get('current_price', 'N/A')}
20-day SMA: ${price_history.get('sma_20', 'N/A')}
100-day SMA: ${price_history.get('sma_100', 'N/A')}
200-day SMA: ${price_history.get('sma_200', 'N/A')}
52-Week High: ${price_history.get('52w_high', 'N/A')}
52-Week Low: ${price_history.get('52w_low', 'N/A')}
Beta: {overview.get('beta', 'N/A')}
Analyst Target: ${overview.get('analyst_target_price', 'N/A')}

VERDICT: {verdict.get('net_verdict', 'N/A')} (conviction: {verdict.get('conviction_score', 'N/A')}/10)
Top Catalyst: {foundation.get('catalysts', [{}])[0].get('catalyst', 'N/A') if foundation.get('catalysts') else 'N/A'}
Catalyst Timeline: {foundation.get('catalysts', [{}])[0].get('timeline', 'N/A') if foundation.get('catalysts') else 'N/A'}

Define actionable trade parameters:

1. ENTRY ZONE: Ideal entry price range with rationale (technical level, valuation support, etc.)
2. STOP LOSS: Where does the bull thesis break? Define a specific price level, not a percentage.
3. PRICE TARGETS:
   - Base case (most likely): price + catalyst that gets you there
   - Bull case (things go right): price + what needs to happen
   - Bear case (things go wrong): price + what breaks
4. RISK/REWARD: Calculate R/R ratio based on entry midpoint, stop, and base target
5. TIMELINE: Realistic timeframe for the thesis to play out
6. POSITION SIZING NOTE: Given beta of {overview.get('beta', 'N/A')}, flag if this is a high-volatility position

IMPORTANT: All `price`, `low`, and `high` values must be plain numeric strings like "235.00" — do NOT include a "$" prefix or any currency symbol. The UI and email template add the "$" themselves.

Return a JSON object:
{{
  "entry_zone": {{
    "low": "...",
    "high": "...",
    "rationale": "..."
  }},
  "stop_loss": {{
    "price": "...",
    "rationale": "..."
  }},
  "price_targets": {{
    "base": {{"price": "...", "catalyst": "...", "timeline": "..."}},
    "bull": {{"price": "...", "catalyst": "...", "timeline": "..."}},
    "bear": {{"price": "...", "catalyst": "...", "timeline": "..."}}
  }},
  "risk_reward_ratio": "...",
  "thesis_timeline": "...",
  "volatility_warning": true/false,
  "trade_summary": "2-3 sentence actionable summary"
}}"""
