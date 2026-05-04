import os
import json
import anthropic
from dotenv import load_dotenv
from research.prompts import (
    macro_screen_prompt,
    research_foundation_prompt,
    valuation_prompt,
    risk_prompt,
    technicals_prompt,
    bull_bear_verdict_prompt,
    trade_setup_prompt,
    capital_deployment_prompt,
    options_overlay_prompt,
    portfolio_fit_prompt,
)

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

OPUS = "claude-opus-4-6"
SONNET = "claude-sonnet-4-6"

PORTFOLIO_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "portfolio.json")


def load_portfolio_context() -> dict | None:
    """
    Read user's portfolio context from backend/portfolio.json. Returns None when
    the file is missing or empty so the prompt can use its generic-guardrails
    branch.
    """
    if not os.path.exists(PORTFOLIO_FILE):
        return None
    try:
        with open(PORTFOLIO_FILE) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(data, dict):
        return None
    has_anything = (
        data.get("current_holdings")
        or data.get("sector_exposure_pcts")
        or data.get("max_single_position_pct")
        or data.get("max_sector_exposure_pct")
    )
    return data if has_anything else None


def call_claude(prompt: str, model: str, max_tokens: int = 4000) -> dict:
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()

    # Extract JSON from markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    # Find the outermost JSON object even if there's trailing text
    brace_start = text.find("{")
    if brace_start != -1:
        depth = 0
        for i, ch in enumerate(text[brace_start:], brace_start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    text = text[brace_start:i+1]
                    break

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_response": text, "parse_error": True}


def _stage_failed(result: dict | None) -> bool:
    return not result or result.get("parse_error") is True


def run_pipeline(ticker: str, stock_data: dict, sec_data: dict, youtube_data: list, congress_data: dict) -> dict:
    overview = stock_data.get("overview", {})
    price_history = stock_data.get("price_history", {})
    financials = stock_data.get("financials", {})

    print(f"  [1/10] Macro screen...")
    macro = call_claude(
        macro_screen_prompt(ticker, overview),
        model=SONNET,
        max_tokens=3000,
    )

    print(f"  [2/10] Research foundation...")
    foundation = call_claude(
        research_foundation_prompt(ticker, overview, sec_data, financials),
        model=OPUS,
        max_tokens=5000,
    )

    print(f"  [3/10] Valuation...")
    valuation = call_claude(
        valuation_prompt(ticker, overview, financials, price_history),
        model=OPUS,
        max_tokens=4000,
    )

    print(f"  [4/10] Risk & red teaming...")
    risk = call_claude(
        risk_prompt(ticker, overview, sec_data, youtube_data),
        model=OPUS,
        max_tokens=5000,
    )

    print(f"  [5/10] Technicals...")
    technicals = call_claude(
        technicals_prompt(ticker, price_history, overview),
        model=OPUS,
        max_tokens=3000,
    )

    print(f"  [6/10] Bull/bear/verdict...")
    verdict = call_claude(
        bull_bear_verdict_prompt(ticker, foundation, valuation, risk, technicals, macro),
        model=OPUS,
        max_tokens=4000,
    )

    print(f"  [7/10] Trade setup...")
    trade_setup = call_claude(
        trade_setup_prompt(ticker, price_history, overview, verdict, foundation),
        model=OPUS,
        max_tokens=3000,
    )

    # ── Stages 8–10: How to buy this (depends on trade_setup) ───────────────
    how_to_buy: dict = {}
    options_overlay: dict = {}
    portfolio_fit: dict = {}

    if _stage_failed(trade_setup):
        print(f"  [8/10] How to buy — SKIPPED (trade setup unavailable)")
        how_to_buy = {"error": "skipped: trade_setup unavailable"}
        options_overlay = {"error": "skipped: how_to_buy unavailable"}
        portfolio_fit = {"error": "skipped: how_to_buy unavailable"}
    else:
        print(f"  [8/10] How to buy this...")
        how_to_buy = call_claude(
            capital_deployment_prompt(ticker, price_history, overview, verdict, trade_setup, foundation),
            model=OPUS,
            max_tokens=4000,
        )

        if _stage_failed(how_to_buy):
            print(f"  [9/10] Options overlay — SKIPPED (how_to_buy parse failed)")
            options_overlay = {"error": "skipped: how_to_buy parse failed"}
            print(f"  [10/10] Portfolio fit — SKIPPED (how_to_buy parse failed)")
            portfolio_fit = {"error": "skipped: how_to_buy parse failed"}
        else:
            print(f"  [9/10] Options overlay...")
            options_overlay = call_claude(
                options_overlay_prompt(ticker, overview, price_history, verdict, trade_setup, how_to_buy),
                model=OPUS,
                max_tokens=3500,
            )

            print(f"  [10/10] Portfolio fit...")
            portfolio_context = load_portfolio_context()
            portfolio_fit = call_claude(
                portfolio_fit_prompt(ticker, overview, how_to_buy, portfolio_context),
                model=OPUS,
                max_tokens=2500,
            )

    from datetime import datetime as _dt
    return {
        "ticker": ticker.upper(),
        "meta": {
            "generated_at": _dt.now().isoformat(),
            "current_price": overview.get("current_price")
                or price_history.get("current_price"),
            "beta": overview.get("beta"),
            "market_cap": overview.get("market_cap"),
        },
        "macro": macro,
        "foundation": foundation,
        "valuation": valuation,
        "risk": risk,
        "technicals": technicals,
        "verdict": verdict,
        "trade_setup": trade_setup,
        "how_to_buy": how_to_buy,
        "options_overlay": options_overlay,
        "portfolio_fit": portfolio_fit,
        "patch_log": [],
    }


def apply_patch(report: dict, source: str, content: str, is_concrete_evidence: bool) -> dict:
    """Apply a user-provided update to an existing report."""
    from datetime import datetime

    patch_prompt = f"""You are updating a stock research report for {report['ticker']} based on new information.

CURRENT VERDICT: {report['verdict'].get('net_verdict', 'N/A')} (conviction: {report['verdict'].get('conviction_score', 'N/A')}/10)
CURRENT BULL SYNTHESIS: {report['verdict'].get('bull_synthesis', 'N/A')[:500]}
CURRENT BEAR SYNTHESIS: {report['verdict'].get('bear_synthesis', 'N/A')[:500]}

NEW INFORMATION (source: {source}):
{content}

This information has been classified as: {"CONCRETE EVIDENCE — update baseline" if is_concrete_evidence else "OPINION/THESIS — conversation layer only"}

1. What does the author/source get right?
2. What are they missing or glossing over?
3. Does this change the bull or bear case? How?
4. Updated conviction score (1-10):
5. What specifically changed in your view?

Return a JSON object:
{{
  "source_credibility": "high|medium|low",
  "what_they_got_right": "...",
  "what_they_missed": "...",
  "bull_case_impact": "strengthens|weakens|neutral",
  "bear_case_impact": "strengthens|weakens|neutral",
  "updated_conviction_score": 1-10,
  "what_changed": "...",
  "updated_verdict": "strong_buy|buy|hold|sell|strong_sell"
}}"""

    patch_result = call_claude(patch_prompt, model=OPUS, max_tokens=1500)

    patch_entry = {
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "content_preview": content[:200],
        "is_concrete_evidence": is_concrete_evidence,
        "analysis": patch_result,
    }

    report["patch_log"].append(patch_entry)

    # If concrete evidence, update the verdict
    if is_concrete_evidence and not patch_result.get("parse_error"):
        report["verdict"]["conviction_score"] = patch_result.get("updated_conviction_score", report["verdict"]["conviction_score"])
        report["verdict"]["net_verdict"] = patch_result.get("updated_verdict", report["verdict"]["net_verdict"])
        report["verdict"]["last_updated"] = datetime.now().isoformat()
        report["verdict"]["last_patch_source"] = source

    return report
