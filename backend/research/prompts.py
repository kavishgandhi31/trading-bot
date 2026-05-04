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


def capital_deployment_prompt(
    ticker: str,
    price_history: dict,
    overview: dict,
    verdict: dict,
    trade_setup: dict,
    foundation: dict,
) -> str:
    catalyst = (foundation.get("catalysts") or [{}])[0] if foundation.get("catalysts") else {}
    entry_zone = trade_setup.get("entry_zone") or {}
    stop_loss = trade_setup.get("stop_loss") or {}
    targets = trade_setup.get("price_targets") or {}
    base_target = targets.get("base") or {}
    bull_target = targets.get("bull") or {}
    bear_target = targets.get("bear") or {}
    return f"""You are a position-sizing and capital-allocation strategist for {ticker}.

VERDICT: {verdict.get('net_verdict', 'N/A')} (conviction: {verdict.get('conviction_score', 'N/A')}/10)
Current Price: ${price_history.get('current_price', 'N/A')}
Beta: {overview.get('beta', 'N/A')}
Avg Daily Volume (30d): {price_history.get('avg_volume_30d', 'N/A')}
Market Cap: ${overview.get('market_cap', 'N/A')}
Entry Zone: ${entry_zone.get('low', 'N/A')} – ${entry_zone.get('high', 'N/A')}
Stop Loss: ${stop_loss.get('price', 'N/A')}
Base Target: ${base_target.get('price', 'N/A')}
Bull Target: ${bull_target.get('price', 'N/A')}
Bear Target: ${bear_target.get('price', 'N/A')}
Top Catalyst: {catalyst.get('catalyst', 'N/A')} | Timeline: {catalyst.get('timeline', 'N/A')}

═══ FRAMEWORK ═══
You are sizing a position for an investor who has already decided how much TOTAL capital they
are willing to risk on this thesis ("thesis-budget"). Express everything as a PERCENTAGE of
that thesis-budget — never in dollars or share counts. The investor will multiply your
percentages by their own dollar amount.

You must give a deployment recommendation for EVERY verdict, not just buys. Even a hold or
sell can warrant a small probe position, a watch-only stance, or an outright avoid — your job
is to tell the user honestly whether ANY capital is worth deploying right now, and if so, how.

═══ POSTURE — choose one ═══
Pick a `posture` based on the verdict, conviction, and setup quality:

  • "deploy_full"   — strong_buy with conviction 8+, clean setup. Use 60–100% of thesis-budget.
  • "deploy_partial" — buy or strong_buy with conviction 6–8, or strong setup with caveats.
                       Use 30–60%.
  • "starter_only"  — buy with conviction <6, OR hold with a credible asymmetric setup
                       (e.g. trading near support, catalyst pending). Use 5–15% — enough to
                       have skin in the game and learn, not enough to hurt if wrong. Common
                       use: "I want exposure if X plays out but I'm not confident enough to
                       size up." Always disclose that this is a probe, not a full position.
  • "watch_only"    — hold or weak buy with no clear edge today. Use 0%. The user should
                       wait for a specific trigger before any deployment. Define that trigger.
  • "avoid"         — sell, strong_sell, or any verdict where the risk/reward is broken.
                       Use 0%. Explain what would have to change for this to become
                       deployable.

The posture drives `total_allocation_pct`. Be honest — do NOT force a starter just to have
something to say. If the answer is "stay out", say so cleanly.

═══ DEPLOYMENT PLAN ═══
1. TOTAL ALLOCATION (`total_allocation_pct`, 0–100)
   The share of the thesis-budget to ultimately put to work. Calibrate to:
     • Conviction score (higher → larger, but capped by posture).
     • Beta / volatility (high beta shrinks size meaningfully).
     • Distance from entry zone (chasing far above the zone → smaller; deep in zone → larger).
     • Liquidity — if avg daily $-volume is thin relative to a sensible position, shrink the
       size and flag it in `liquidity_flag`.

2. TRANCHES (laddered entries) — required if posture is `deploy_full`, `deploy_partial`, or
   `starter_only`. Empty otherwise.
   Break the total allocation into 1–4 tranches at distinct price levels (1 tranche is fine
   for a starter; 3–4 for a full deployment averaging into weakness). The sum of
   `pct_of_total` across all tranches must equal `total_allocation_pct` EXACTLY.
   Order tranches from highest price (fires first as price drops into the zone) to lowest.
   For each tranche specify:
     • `price` — trigger price as a plain numeric string (no "$").
     • `pct_of_total` — share of the THESIS-BUDGET deployed at this level (0–100).
     • `trigger_type` — one of: "limit" (price tag), "breakout" (close above level),
       "post_catalyst" (after specific event), "time_based" (DCA — calendar-driven).
     • `condition` — one short sentence on what makes this the right add
       (e.g. "tag of 100-day SMA", "retest of breakout", "first close above 52w high",
       "after Q3 earnings clears").
     • `rationale` — one short sentence on WHY this level deserves capital.

3. CATALYST TIMING (`catalyst_timing`)
   If there's a known near-term catalyst (earnings, FDA, product launch), say explicitly
   whether to deploy BEFORE the catalyst (taking event risk for a better price), AFTER
   (waiting for confirmation, paying up for certainty), or SPLIT (some now, some after).
   If no near-term catalyst, set this to "n/a" and explain.

4. DRY POWDER (`dry_powder_pct`, 0–100)
   How much of the thesis-budget to hold UNALLOCATED in reserve for: (a) a deeper
   bear-case flush below the entry zone, (b) adding on a confirmed thesis upgrade, or
   (c) tactical re-entries after stops. `total_allocation_pct + dry_powder_pct` does not
   need to equal 100 — the remainder is "do not allocate to this name at all".

5. RISK PER TRADE (`risk_per_trade_pct`)
   If the FULL planned position were filled at the average tranche price and the stop hit,
   approximately what % of the thesis-budget would be lost? Compute:
     loss_pct ≈ total_allocation_pct × (avg_entry − stop) / avg_entry
   Round to 1 decimal. This tells the user the worst-case dollar damage in pct terms.

6. SCALE-OUT (optional, `scale_out`)
   1–2 trim levels: a price and the share of the POSITION (not budget) to take off there.
   Use `pct_of_position` (% of what was actually deployed) so it stays distinct from
   entry sizing. Empty array if you would rather hold to the targets.

7. INVALIDATION (`invalidation_price`)
   The exact price below which the deployment plan is void and any unfilled tranches should
   be abandoned (usually the stop_loss). Plain number.

8. RE-EVALUATION TRIGGERS (`reevaluate_triggers`)
   2–3 specific events that would force a fresh look at the plan even if no price level is
   hit (e.g. "guidance cut at next earnings", "key competitor launches X", "Fed pivots
   hawkish", "30 days with no catalyst progress").

9. LIQUIDITY FLAG (`liquidity_flag`)
   "ok" | "thin" | "illiquid" — based on avg daily $-volume vs a reasonable position size.
   For micro-cap or thinly-traded names, flag this so the user uses limit orders and slices
   entries.

10. SIZING MATH (`sizing_math`) — Kelly / fractional-Kelly sanity check
    Estimate the rough payoff distribution and what classical sizing math would suggest. This
    is a SANITY CHECK on the posture-driven `total_allocation_pct`, not a substitute for it.
    Estimate:
      • `estimated_win_probability_pct` — your subjective probability the base or bull case
        plays out before the bear case (0–100). Be honest, not anchored to 50.
      • `estimated_avg_win_pct` — expected return if the thesis works (use base target as
        anchor, % above avg entry).
      • `estimated_avg_loss_pct` — expected loss if the thesis breaks (use stop, % below avg
        entry).
      • `kelly_fraction_pct` — full Kelly: ((p × b) − (1 − p)) / b × 100, where p = win
        probability and b = avg_win / avg_loss. May be negative (means: don't deploy).
      • `fractional_kelly_recommendation_pct` — quarter-Kelly (kelly_fraction / 4), the
        practitioner's safe default. Floor at 0 if Kelly is negative.
      • `agrees_with_posture` — true if `fractional_kelly_recommendation_pct` is within ±15
        percentage points of `total_allocation_pct`, false otherwise. If false, briefly note
        in `disagreement_note` whether the posture is more or less aggressive than the math.
      • `disclaimer` — REQUIRED, copy verbatim: "These probabilities and payoffs are model
        judgements, not historical statistics. Kelly sizing is a sanity check, not a price
        target — the posture-driven allocation is the recommendation."

11. HOLD PERIOD (`hold_period`)
    How long this thesis is meant to live, and when to look at it again.
      • `expected_hold_days` — approximate days until the base case is expected to play out.
      • `catalyst_window` — short phrase describing the event window (e.g. "next 2 earnings",
        "through FY26 product cycle", "open-ended — secular thesis").
      • `re_eval_cadence` — one of: "weekly", "monthly", "quarterly", "on-event-only".
      • `notes` — one sentence on what defines the end of the hold (catalyst, target hit,
        thesis decay).

12. TAX LOT STRATEGY (`tax_lot_strategy`) — generic guidance only
    For laddered entries this matters because each tranche becomes a separate cost basis.
      • `ladder_lots_separately` — true if the user should enable per-lot tracking with
        their broker so each tranche is identifiable, false if it doesn't meaningfully matter
        for this setup.
      • `preferred_lot_method` — one of: "FIFO", "LIFO", "HIFO", "specific_id". Recommend
        based on the scale-out plan: "HIFO" or "specific_id" for staged trims (sell highest-
        cost lots first to defer gains), "FIFO" if no scale-out planned.
      • `trim_priority` — short phrase on which lots to sell first when scaling out (e.g.
        "highest-cost lots first to harvest gains at lowest tax cost", "earliest lots first
        once they cross 1-year holding for long-term treatment").
      • `notes` — one sentence on why this matters for THIS setup specifically.
      • `disclaimer` — REQUIRED, copy verbatim: "Generic guidance only — consult your broker
        and a tax advisor in your jurisdiction. Rules vary by account type (taxable, IRA,
        Roth) and country."

13. SUMMARY (`deployment_summary`)
    2–3 plain-English sentences: posture + total allocation + the shape of the ladder + the
    one thing that would make you change the plan.

═══ HARD RULES ═══
• If posture is `watch_only` or `avoid`: `total_allocation_pct` MUST be 0, `tranches` MUST
  be [], and `do_not_deploy_reason` MUST clearly explain WHY (e.g. "verdict is sell — no
  long deployment", "valuation is fair, no margin of safety, wait for {ticker} to retest
  $X before any starter").
• If posture is `starter_only`: cap `total_allocation_pct` at 15. State explicitly in the
  summary that this is a PROBE, not a full position.
• Sum of tranche `pct_of_total` must equal `total_allocation_pct` exactly.
• Never recommend deploying capital BELOW the invalidation price.

PRICE FORMAT: All `price` and `invalidation_price` values must be plain numeric strings like
"232.50" — no "$" or currency symbol. The UI adds it.

Return a JSON object with EXACTLY this shape:
{{
  "posture": "deploy_full|deploy_partial|starter_only|watch_only|avoid",
  "should_deploy": true|false,
  "do_not_deploy_reason": "",
  "total_allocation_pct": 0-100,
  "dry_powder_pct": 0-100,
  "risk_per_trade_pct": 0-100,
  "catalyst_timing": "before|after|split|n/a — short rationale",
  "tranches": [
    {{
      "price": "...",
      "pct_of_total": 0-100,
      "trigger_type": "limit|breakout|post_catalyst|time_based",
      "condition": "...",
      "rationale": "..."
    }}
  ],
  "scale_out": [
    {{
      "price": "...",
      "pct_of_position": 0-100,
      "rationale": "..."
    }}
  ],
  "invalidation_price": "...",
  "reevaluate_triggers": ["...", "..."],
  "liquidity_flag": "ok|thin|illiquid",
  "sizing_math": {{
    "estimated_win_probability_pct": 0-100,
    "estimated_avg_win_pct": "...",
    "estimated_avg_loss_pct": "...",
    "kelly_fraction_pct": "...",
    "fractional_kelly_recommendation_pct": "...",
    "agrees_with_posture": true|false,
    "disagreement_note": "",
    "disclaimer": "These probabilities and payoffs are model judgements, not historical statistics. Kelly sizing is a sanity check, not a price target — the posture-driven allocation is the recommendation."
  }},
  "hold_period": {{
    "expected_hold_days": 0,
    "catalyst_window": "...",
    "re_eval_cadence": "weekly|monthly|quarterly|on-event-only",
    "notes": "..."
  }},
  "tax_lot_strategy": {{
    "ladder_lots_separately": true|false,
    "preferred_lot_method": "FIFO|LIFO|HIFO|specific_id",
    "trim_priority": "...",
    "notes": "...",
    "disclaimer": "Generic guidance only — consult your broker and a tax advisor in your jurisdiction. Rules vary by account type (taxable, IRA, Roth) and country."
  }},
  "deployment_summary": "..."
}}"""


def options_overlay_prompt(
    ticker: str,
    overview: dict,
    price_history: dict,
    verdict: dict,
    trade_setup: dict,
    deployment: dict,
) -> str:
    posture = deployment.get("posture", "n/a")
    entry_zone = trade_setup.get("entry_zone") or {}
    stop_loss = trade_setup.get("stop_loss") or {}
    targets = trade_setup.get("price_targets") or {}
    base_target = targets.get("base") or {}
    bull_target = targets.get("bull") or {}
    bear_target = targets.get("bear") or {}
    return f"""You are an options strategist designing a defined-risk overlay for {ticker}.

CONTEXT:
Verdict: {verdict.get('net_verdict', 'N/A')} (conviction {verdict.get('conviction_score', 'N/A')}/10)
Current Price: ${price_history.get('current_price', 'N/A')}
Beta: {overview.get('beta', 'N/A')}
Posture: {posture}
Total Allocation Plan: {deployment.get('total_allocation_pct', 'N/A')}% of thesis-budget
Entry Zone: ${entry_zone.get('low', 'N/A')} – ${entry_zone.get('high', 'N/A')}
Stop Loss: ${stop_loss.get('price', 'N/A')}
Base Target: ${base_target.get('price', 'N/A')}
Bull Target: ${bull_target.get('price', 'N/A')}
Bear Target: ${bear_target.get('price', 'N/A')}

═══ FRAMEWORK ═══
Every verdict — bullish, neutral, OR bearish — has appropriate options strategies. Your job
is to match the strategy to the directional view and conviction, NOT to default to bullish
strategies. Skipping options entirely is only acceptable when the chain is genuinely unusable
(see the `applicable: false` escape at the bottom).

Options strategies fall into four buckets:

  1. BULLISH (profit when price rises)
     • `long_call` — pay premium for leveraged upside
     • `call_spread` (bull call debit spread) — defined-risk bullish
     • `csp` (cash-secured put) — get paid to potentially buy lower
     • `bull_put_spread` (credit spread) — collect premium betting price stays above a level
     • `cc` (covered call, requires owning shares) — yield on a position
     • `diagonal` — long-dated long call + short near-term call against it

  2. BEARISH (profit when price falls)
     • `long_put` — pay premium for leveraged downside
     • `put_spread` (bear put debit spread) — defined-risk bearish
     • `bear_call_spread` (credit spread) — collect premium betting price stays below a level
     • `collar` (requires owning shares) — protective put + covered call, caps both sides

  3. NEUTRAL / SIDEWAYS (profit when price stays in a range)
     • `iron_condor` — sells a call spread above and a put spread below; profits if price
        stays between the inner strikes
     • `calendar_spread` — sells near-term option, buys longer-dated same-strike option;
        profits from time decay if price stays near strike
     • `cc` (covered call, if you already own shares) — yields income while range-bound

  4. HIGH-VOLATILITY EVENT BETS (bet a big move happens, direction unknown)
     • `long_straddle` — long call + long put at same strike; profits if move is large
        either way (rare recommendation — only flag for binary catalysts)

═══ MATCH TO VERDICT — recommend 1–3 strategies per report ═══

  • verdict=strong_buy → 1–2 bullish + optionally 1 bullish credit (CSP or bull put spread).
    Examples: long call OR call spread for upside; CSP at deepest tranche.
  • verdict=buy → 1–2 bullish, lean toward defined-risk (call spread, CSP, bull put spread).
    Long calls OK only if conviction is at the high end of the buy range.
  • verdict=hold → 1–2 NEUTRAL strategies (iron condor or calendar spread) as the primary
    recommendation, since the verdict says "no edge in either direction". Optionally add
    ONE small bearish OR bullish bet (small put spread / small call spread / CSP at
    bear-case price = "I'd buy if it crashed") if there's a slight lean.
  • verdict=sell → 1–2 bearish, lean toward defined-risk (put spread, bear call spread).
    Long put only if the conviction is at the high end.
  • verdict=strong_sell → 1–2 bearish, can include outright long puts. Add a bear call
    spread for income if IV is rich.

If the user owns shares (you don't actually know — but the deployment plan implies they
might), include `collar` for sell/strong_sell (protective downside) or `cc` for hold
(yield while range-bound) and label it clearly with "if you already own shares of {ticker}".

═══ HARD RULES ═══
• You MUST recommend at least one strategy that matches the verdict's directional view —
  do not default to bullish strategies for hold/sell/strong_sell verdicts.
• `iron_condor` and `calendar_spread` should be the FIRST recommendations for hold verdicts,
  not bullish strategies dressed up as "neutral".
• NEVER recommend naked short calls, naked short puts (without cash secured), short
  straddles, or short strangles — these have unlimited or near-unlimited risk and are out
  of scope for this tool. If you'd be tempted to suggest one, use the equivalent defined-risk
  spread instead (bear call spread instead of naked call, iron condor instead of short
  strangle).
• Long straddles are only appropriate when there's a known binary event (earnings, FDA
  decision) within the option's expiration window. Do not recommend otherwise.

═══ STRATEGY OBJECT SHAPE ═══
For each strategy specify:
  • `name` — human-readable strategy name (e.g. "Cash-secured put at $230",
    "Jan-26 240/270 call spread").
  • `strategy_type` — one of: "csp" (cash-secured put), "cc" (covered call),
    "long_call", "long_put", "call_spread" (bull call debit spread),
    "put_spread" (bear put debit spread), "bull_put_spread" (bullish credit),
    "bear_call_spread" (bearish credit), "collar" (protective on shares),
    "diagonal" (long-dated long + short near-term), "iron_condor" (range-bound),
    "calendar_spread" (time-decay), "long_straddle" (binary event).
  • `purpose` — "entry_overlay" | "position_overlay" | "directional_overlay" |
    "income_overlay" (for credit spreads / iron condors / covered calls when the goal
    is collecting premium, not getting long/short).
  • `directional_view` — "bullish" | "bearish" | "neutral" | "high_vol_event".
    This is DETERMINED BY `strategy_type`, NOT a separate judgement. Use this exact
    mapping — no exceptions:
        bullish:        csp, long_call, call_spread, bull_put_spread, diagonal
        bearish:        long_put, put_spread, bear_call_spread
        neutral:        cc, iron_condor, calendar_spread, collar
        high_vol_event: long_straddle
    A bear put spread (`put_spread`) is bearish even on a hold verdict. A long put
    is bearish even on a hold verdict. Never mark a put-buying strategy as neutral.
  • `legs` — array of leg objects (1 for single-leg, 2 for spreads/collars):
        {{ "action": "buy|sell", "right": "call|put", "strike": "...", "expiration_target": "..." }}
    `expiration_target` should be a window like "30–45 DTE" or "Jan 2026" — not a hard
    date, since chains change.
  • `net_premium_direction` — "credit" | "debit".
  • `est_premium_pct_of_strike` — rough premium as % of the primary strike (e.g. "1.8")
    — model estimate based on typical IV for this beta/sector. Plain numeric string.
  • `max_risk_per_contract` — plain numeric string in dollars (per 100-share contract).
  • `max_gain_per_contract` — plain numeric string in dollars, or "uncapped".
  • `breakeven` — plain numeric string (price at expiry where strategy nets zero).
  • `assignment_outcome` — one short sentence on what happens if assigned (especially for
    csp/cc): "Assigned at $X — same as buying tranche 2 of the deployment plan."
  • `best_for` — one sentence on the market scenario this wins in.
  • `not_for` — one sentence on the scenario where this is the wrong tool.
  • `how_it_works` — REQUIRED. 3–5 plain-English sentences explaining the mechanics for
    someone with ZERO options experience. Rules for this field:
      ◦ NO jargon: never use "delta", "theta", "gamma", "vega", "ITM/OTM", "DTE", "leg",
        "underlying", "intrinsic value", "extrinsic value", "premium decay", "Greeks",
        "wings", "skew", "IV crush". If you must mention one, define it inline in
        plain English.
      ◦ Use the actual strike numbers and expiration window from THIS strategy in the
        explanation, not generic placeholders.
      ◦ Cover, in this order: (1) what you do today (buy or sell what, how much it costs
        or pays), (2) what happens if the stock goes UP, (3) what happens if it goes DOWN,
        (4) what happens if the stock barely moves and the option expires, (5) what you
        actually own at the end (shares, cash, or nothing).
      ◦ Use the word "you" — second person, conversational. Avoid "the trader" or
        passive voice.
      ◦ Round numbers when illustrating ("about $180", "roughly 2% of the strike") so the
        reader doesn't get lost in decimals.
      ◦ End with the single most important risk in one sentence ("Worst case: you lose
        the $X premium you paid today" / "Worst case: you're forced to buy 100 shares at
        $X even if the stock crashes to $Y").
      ◦ EXAMPLES of the tone you should match:
          - CSP: "Today you set aside $23,000 in your account and promise your broker
            you'll buy 100 shares of NVDA at $230 if it drops there by January. In return
            you collect about $400 in cash today, which is yours to keep no matter what.
            If NVDA stays above $230, the option expires and you walk away with the $400
            and your cash freed up. If NVDA drops below $230, you must buy the 100 shares
            at $230 — but since you collected $400 up front, your real cost is $226 per
            share. Worst case: NVDA crashes to $150 and you're stuck owning shares worth
            $15,000 that you paid $22,600 for."
          - Long put (bear): "Today you pay about $600 for the right (not the obligation)
            to sell 100 shares of TSLA at $200 anytime before March. You don't need to
            own any TSLA shares to buy this. If TSLA falls to $150, your option is worth
            roughly $5,000 — an $4,400 profit on $600 risked. If TSLA rises or stays
            above $200, the option becomes worthless and you lose the $600 you paid.
            You're betting the stock drops at least below about $194 (the $200 strike
            minus the $6 you paid) before March. Worst case: you lose every dollar of
            the $600 premium."
          - Put spread (bear): "Today you pay about $200 for a package: you buy the right
            to sell TSLA at $200 AND simultaneously give someone else the right to buy
            from you at $180. Net cost: $200 today. If TSLA falls between $180 and $200,
            you make money — the most you can make is $1,800 if it drops to $180 or
            lower. If TSLA stays above $200, you lose the $200 you paid. You're trading
            unlimited downside for a much cheaper bet on a moderate decline. Worst case:
            you lose the $200 premium."

Then provide:
  • `iv_context` — one sentence on whether implied vol on this name is generally rich,
    cheap, or normal vs realized vol, and how that affects strategy choice (rich IV →
    favor selling premium; cheap IV → favor buying).
  • `liquidity_warning` — true|false. True for micro-caps, low-volume options chains, or
    names with wide bid/ask. State the warning in `liquidity_note`.
  • `coordination_with_shares` — one sentence on how the options overlay coordinates with
    the share deployment plan (e.g. "CSP at $230 replaces tranche 3 — if assigned, you've
    bought your deepest tranche at a $X discount via premium").
  • `disclaimer` — REQUIRED, copy verbatim: "Premium estimates and IV context are model
    judgements based on typical option pricing for this profile, not live chain quotes.
    Always check the live chain, bid/ask spread, and open interest before trading. Options
    can lose 100% of premium and assignment can force share purchases at unfavorable prices."

PRICE FORMAT: Strikes, premiums, breakevens — plain numeric strings, no "$".

If options are NOT a good fit for this name (extremely illiquid chain, no listed options,
ultra-low IV makes premium-selling pointless, etc.), return:
{{
  "applicable": false,
  "skip_reason": "...",
  "strategies": [],
  "iv_context": "...",
  "liquidity_warning": true|false,
  "liquidity_note": "...",
  "coordination_with_shares": "n/a",
  "disclaimer": "..."
}}

Otherwise return:
{{
  "applicable": true,
  "skip_reason": "",
  "strategies": [
    {{
      "name": "...",
      "strategy_type": "csp|cc|long_call|long_put|call_spread|put_spread|bull_put_spread|bear_call_spread|collar|diagonal|iron_condor|calendar_spread|long_straddle",
      "purpose": "entry_overlay|position_overlay|directional_overlay|income_overlay",
      "directional_view": "bullish|bearish|neutral|high_vol_event",
      "legs": [
        {{ "action": "buy|sell", "right": "call|put", "strike": "...", "expiration_target": "..." }}
      ],
      "net_premium_direction": "credit|debit",
      "est_premium_pct_of_strike": "...",
      "max_risk_per_contract": "...",
      "max_gain_per_contract": "...",
      "breakeven": "...",
      "assignment_outcome": "...",
      "best_for": "...",
      "not_for": "...",
      "how_it_works": "..."
    }}
  ],
  "iv_context": "...",
  "liquidity_warning": true|false,
  "liquidity_note": "",
  "coordination_with_shares": "...",
  "disclaimer": "Premium estimates and IV context are model judgements based on typical option pricing for this profile, not live chain quotes. Always check the live chain, bid/ask spread, and open interest before trading. Options can lose 100% of premium and assignment can force share purchases at unfavorable prices."
}}"""


def portfolio_fit_prompt(
    ticker: str,
    overview: dict,
    deployment: dict,
    portfolio_context: dict | None = None,
) -> str:
    """
    Build a portfolio-fit prompt that adapts to whether the user has supplied any
    holdings/exposure context.

    `portfolio_context` is OPTIONAL and shaped like:
      {{
        "current_holdings": [
          {{"ticker": "NVDA", "pct_of_portfolio": 12.0, "thesis": "AI infra"}},
          ...
        ],
        "sector_exposure_pcts": {{"Technology": 45, "Energy": 5, ...}},
        "max_single_position_pct": 10,
        "max_sector_exposure_pct": 30,
        "total_portfolio_value": "optional, just for grounding language",
        "notes": "free-text from the user"
      }}

    If None or empty, the model gives generic concentration guidance based on sector
    knowledge and acknowledges that no portfolio context was provided.
    """
    has_context = bool(portfolio_context)
    sector = overview.get("sector", "N/A")
    industry = overview.get("industry", "N/A")
    posture = deployment.get("posture", "n/a")
    total_alloc = deployment.get("total_allocation_pct", "N/A")

    if has_context:
        holdings = portfolio_context.get("current_holdings", []) or []
        sector_exposure = portfolio_context.get("sector_exposure_pcts", {}) or {}
        max_single = portfolio_context.get("max_single_position_pct", "not specified")
        max_sector = portfolio_context.get("max_sector_exposure_pct", "not specified")
        notes = portfolio_context.get("notes", "")
        portfolio_value = portfolio_context.get("total_portfolio_value", "not specified")

        holdings_lines = "\n".join(
            f"  - {h.get('ticker','?')}: {h.get('pct_of_portfolio','?')}% of portfolio"
            + (f" ({h.get('thesis','')})" if h.get("thesis") else "")
            for h in holdings
        ) or "  (none provided)"

        sector_lines = "\n".join(
            f"  - {s}: {p}%" for s, p in sector_exposure.items()
        ) or "  (none provided)"

        context_block = f"""USER-PROVIDED PORTFOLIO CONTEXT:
Total portfolio value: {portfolio_value}
Stated max single-position cap: {max_single}%
Stated max sector exposure cap: {max_sector}%

Current holdings:
{holdings_lines}

Sector exposure already on:
{sector_lines}

User notes: {notes if notes else '(none)'}"""
    else:
        context_block = """USER-PROVIDED PORTFOLIO CONTEXT: (none — user has not supplied
holdings or exposure caps.)

Operate from generic prudent-investor guardrails: assume a well-diversified investor would
cap a single name at ~5–10% and a single sector at ~20–30%, but state explicitly that you
have no actual portfolio data and these are heuristics."""

    return f"""You are a portfolio-fit reviewer for {ticker}.

POSITION CONTEXT:
{ticker} — sector: {sector} | industry: {industry}
Beta: {overview.get('beta', 'N/A')}
Proposed posture: {posture}
Proposed total allocation: {total_alloc}% of thesis-budget for THIS name

{context_block}

═══ YOUR JOB ═══
Assess whether adding {ticker} at the proposed allocation is a sensible portfolio-level
decision, given the user's existing exposure (or generic guardrails if no context was
provided). The posture/allocation from the deployment stage is for THIS name in isolation —
your job is to overlay portfolio context and flag concentration risks.

Cover:

1. CONCENTRATION CHECK
   • If user provided holdings: compute (proposed allocation × thesis-budget assumption)
     and compare to their stated single-position cap. Note: you don't know the dollar
     thesis-budget, so reason in relative terms — "if your thesis-budget for {ticker} is
     5% of portfolio and you deploy {total_alloc}% of it, that's roughly X% of total
     portfolio, vs your {max_single if has_context else 'generic'} cap."
   • Flag if {ticker} is highly correlated with names already held (same sector / same
     theme / same key driver — e.g. all AI infra, all energy producers, all rate-sensitive).
   • If user did NOT provide context, give the generic version: "at the proposed sizing,
     this would be roughly small/moderate/large for a typical portfolio".

2. SECTOR / THEME OVERLAP
   • If sector exposure data was provided: compare current {sector} exposure + this add to
     stated max. Call out specifically which existing holdings drive the overlap.
   • Identify thematic overlap that isn't captured by sector tags (e.g. NVDA + AVGO + AMD
     are all "Tech" but really one bet on AI infra).

3. CORRELATION-DRIVEN DOWNSIZE
   If concentration is too high, recommend a SCALED-DOWN allocation specifically for THIS
   user's portfolio. Format: "reduce total_allocation_pct from {total_alloc}% to X%
   because <reason>". If no downsize is needed, say so.

4. DIVERSIFICATION FIT
   How does {ticker} fit the existing book? Is it additive (different risk driver), redundant
   (more of the same exposure), or hedging (counter-cyclical to current bets)?

5. OUT-OF-SCOPE WARNINGS
   Briefly note things you CAN'T see and the user should still consider on their own:
   account-type mix (taxable vs tax-advantaged), liquidity needs, currency exposure,
   private holdings, etc.

═══ HARD RULES ═══
• If `portfolio_context` was empty, set `using_user_context` to false and prefix every
  concentration claim with "without portfolio data, ...".
• Never claim a specific dollar figure unless the user provided `total_portfolio_value`.
• If the user-provided caps would be violated, `concentration_risk` must be "high" and
  `recommended_allocation_adjustment_pct` must be lower than `total_alloc`.

Return a JSON object with EXACTLY this shape:
{{
  "using_user_context": true|false,
  "concentration_risk": "low|moderate|high",
  "single_position_check": {{
    "violates_user_cap": true|false,
    "notes": "..."
  }},
  "sector_overlap_check": {{
    "current_sector_exposure_pct": "...",
    "post_add_sector_exposure_pct": "...",
    "violates_user_cap": true|false,
    "overlapping_holdings": ["..."],
    "notes": "..."
  }},
  "thematic_overlap": {{
    "themes": ["..."],
    "overlapping_holdings": ["..."],
    "notes": "..."
  }},
  "diversification_fit": "additive|redundant|hedging",
  "recommended_allocation_adjustment_pct": 0-100,
  "adjustment_rationale": "...",
  "out_of_scope_warnings": ["..."],
  "portfolio_fit_summary": "2-3 sentence plain-English assessment"
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
