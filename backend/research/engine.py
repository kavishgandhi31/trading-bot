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
)

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

OPUS = "claude-opus-4-6"
SONNET = "claude-sonnet-4-6"


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


def run_pipeline(ticker: str, stock_data: dict, sec_data: dict, youtube_data: list, congress_data: dict) -> dict:
    overview = stock_data.get("overview", {})
    price_history = stock_data.get("price_history", {})
    financials = stock_data.get("financials", {})

    print(f"  [1/7] Macro screen...")
    macro = call_claude(
        macro_screen_prompt(ticker, overview),
        model=SONNET,
        max_tokens=3000,
    )

    print(f"  [2/7] Research foundation...")
    foundation = call_claude(
        research_foundation_prompt(ticker, overview, sec_data, financials),
        model=OPUS,
        max_tokens=5000,
    )

    print(f"  [3/7] Valuation...")
    valuation = call_claude(
        valuation_prompt(ticker, overview, financials, price_history),
        model=OPUS,
        max_tokens=4000,
    )

    print(f"  [4/7] Risk & red teaming...")
    risk = call_claude(
        risk_prompt(ticker, overview, sec_data, youtube_data),
        model=OPUS,
        max_tokens=5000,
    )

    print(f"  [5/7] Technicals...")
    technicals = call_claude(
        technicals_prompt(ticker, price_history, overview),
        model=OPUS,
        max_tokens=3000,
    )

    print(f"  [6/7] Bull/bear/verdict...")
    verdict = call_claude(
        bull_bear_verdict_prompt(ticker, foundation, valuation, risk, technicals, macro),
        model=OPUS,
        max_tokens=4000,
    )

    print(f"  [7/7] Trade setup...")
    trade_setup = call_claude(
        trade_setup_prompt(ticker, price_history, overview, verdict, foundation),
        model=OPUS,
        max_tokens=3000,
    )

    return {
        "ticker": ticker.upper(),
        "macro": macro,
        "foundation": foundation,
        "valuation": valuation,
        "risk": risk,
        "technicals": technicals,
        "verdict": verdict,
        "trade_setup": trade_setup,
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
