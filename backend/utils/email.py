import os
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_APP_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")
_FALLBACK_RECIPIENT = os.getenv("EMAIL_RECIPIENT")

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")


def get_recipients() -> list[str]:
    """Return the configured recipient list, falling back to .env value."""
    try:
        with open(CONFIG_FILE) as f:
            data = json.load(f)
        recipients = [r for r in data.get("recipients", []) if r.strip()]
        if recipients:
            return recipients
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    # Fall back to .env value
    if _FALLBACK_RECIPIENT:
        return [_FALLBACK_RECIPIENT]
    return []


def _safe(data: dict, *keys, default="Not available"):
    """Safely traverse nested dict keys."""
    val = data
    for k in keys:
        if not isinstance(val, dict):
            return default
        val = val.get(k, default)
    return val if val not in (None, "", [], {}) else default


def _list_items(items, default="No data available"):
    if not items or not isinstance(items, list):
        return f'<p style="font-size:14px;color:#888;font-style:italic;margin:4px 0 0 0">{default}</p>'
    html = "".join(f"<li>{item}</li>" for item in items if item)
    return f'<ul style="margin:8px 0 0 0;padding-left:20px;color:#334155;font-size:14px;line-height:1.7">{html}</ul>'


def _helper(text: str) -> str:
    """Render a subtle inline helper text block."""
    return f'<div style="margin:4px 0 8px 0;padding:6px 10px;font-size:12px;line-height:1.55;color:#8b5cf6;background:#f8f7ff;border-left:2px solid #c4b5fd;border-radius:0 4px 4px 0;font-family:-apple-system,sans-serif">{text}</div>'


def _verdict_meta(verdict_key: str) -> tuple:
    mapping = {
        "strong_buy":  ("STRONG BUY",  "#059669", "#ecfdf5", "#059669"),
        "buy":         ("BUY",         "#10b981", "#ecfdf5", "#059669"),
        "hold":        ("HOLD",        "#f59e0b", "#fffbeb", "#b45309"),
        "sell":        ("SELL",        "#ef4444", "#fef2f2", "#dc2626"),
        "strong_sell": ("STRONG SELL", "#dc2626", "#fef2f2", "#991b1b"),
    }
    return mapping.get(verdict_key, ("NEUTRAL", "#6b7280", "#f8fafc", "#475569"))


def _score_bar(score, label: str) -> str:
    """Render a mini score bar for the scorecard."""
    try:
        s = int(score)
    except (ValueError, TypeError):
        s = 0
    pct = min(s * 10, 100)
    if s >= 8:
        color = "#10b981"
    elif s >= 6:
        color = "#3b82f6"
    elif s >= 4:
        color = "#f59e0b"
    else:
        color = "#ef4444"
    return f'''<div style="text-align:center;flex:1;padding:0 12px">
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px">{label}</div>
  <div style="font-size:28px;font-weight:800;color:#0f172a;line-height:1;font-family:-apple-system,sans-serif">{score}</div>
  <div style="margin:6px auto 0;width:48px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden"><div style="width:{pct}%;height:100%;background:{color};border-radius:2px"></div></div>
</div>'''


def _section_block(label: str, title: str, content: str) -> str:
    """Render a research section as a static block with clear heading."""
    return f'''<div style="border-bottom:1px solid #e2e8f0;padding:24px 0">
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px">{label}</div>
  <div style="font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;margin-bottom:16px">{title}</div>
  {content}
</div>'''


def build_html_report(report: dict) -> str:
    ticker = report.get("ticker", "N/A")
    date_str = datetime.now().strftime("%B %d, %Y")

    macro = report.get("macro", {})
    foundation = report.get("foundation", {})
    valuation = report.get("valuation", {})
    risk = report.get("risk", {})
    technicals = report.get("technicals", {})
    verdict = report.get("verdict", {})
    trade = report.get("trade_setup", {})
    patches = report.get("patch_log", [])

    verdict_key = verdict.get("net_verdict", "hold")
    verdict_label, vcolor, vbg, vborder = _verdict_meta(verdict_key)
    conviction = verdict.get("conviction_score", "—")

    f_score = foundation.get("foundation_score", "—")
    v_score = valuation.get("valuation_score", "—")
    r_score = risk.get("risk_score", "—")
    t_score = technicals.get("technicals_score", "—")

    # ── Trade setup values ────────────────────────────────────────────────
    # Strip any leading "$" so we never double-prefix when the LLM already included it.
    def _strip_dollar(v):
        s = str(v) if v is not None else ""
        return s.lstrip().lstrip("$").lstrip()

    entry_low = _strip_dollar(_safe(trade, "entry_zone", "low"))
    entry_high = _strip_dollar(_safe(trade, "entry_zone", "high"))
    entry_zone = f"${entry_low} – ${entry_high}" if entry_low and entry_low != "Not available" else "See analysis"
    stop_price = _strip_dollar(_safe(trade, "stop_loss", "price"))
    stop_label = f"${stop_price}" if stop_price and stop_price != "Not available" else "See analysis"
    base_price = _strip_dollar(_safe(trade, "price_targets", "base", "price"))
    bull_price = _strip_dollar(_safe(trade, "price_targets", "bull", "price"))
    bear_price = _strip_dollar(_safe(trade, "price_targets", "bear", "price"))
    rr_ratio = _safe(trade, "risk_reward_ratio")

    # ── Catalysts ─────────────────────────────────────────────────────────
    catalysts_html = ""
    for cat in (foundation.get("catalysts") or []):
        rating = (cat.get("rating") or "").lower()
        badge_bg = {"critical": "#fef2f2", "high": "#fffbeb", "strategic": "#eff6ff"}.get(rating, "#f8fafc")
        badge_text = {"critical": "#dc2626", "high": "#b45309", "strategic": "#2563eb"}.get(rating, "#475569")
        badge_border = {"critical": "#fecaca", "high": "#fde68a", "strategic": "#bfdbfe"}.get(rating, "#e2e8f0")
        catalysts_html += f'''<div style="padding:12px 0;border-bottom:1px solid #f1f5f9">
  <span style="display:inline-block;font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:{badge_text};background:{badge_bg};border:1px solid {badge_border};padding:2px 8px;border-radius:3px;margin-bottom:6px">{cat.get('rating','')}</span>
  <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px">{cat.get('catalyst','')}</div>
  <div style="font-size:13px;color:#64748b;line-height:1.6">{cat.get('timeline','')} — {cat.get('impact','')[:200]}</div>
</div>'''
    if not catalysts_html:
        catalysts_html = '<p style="color:#94a3b8;font-size:14px;font-style:italic">No catalysts identified.</p>'

    # ── Key risks ─────────────────────────────────────────────────────────
    risks_html = ""
    for r in (risk.get("skeptic_risks") or []):
        sev = (r.get("severity") or "").lower()
        dot_color = {"critical": "#ef4444", "high": "#f59e0b", "medium": "#6b7280"}.get(sev, "#94a3b8")
        risks_html += f'''<div style="padding:12px 0;border-bottom:1px solid #f1f5f9">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{dot_color};flex-shrink:0"></span>
    <span style="font-size:15px;font-weight:600;color:#1e293b">{r.get('risk','')}</span>
    <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;color:{dot_color};letter-spacing:0.05em">{r.get('severity','')}</span>
  </div>
  <div style="font-size:13px;color:#64748b;line-height:1.6;padding-left:16px">{r.get('detail','')[:250]}</div>
</div>'''
    if not risks_html:
        risks_html = '<p style="color:#94a3b8;font-size:14px;font-style:italic">No specific risks identified.</p>'

    # ── Patch log ─────────────────────────────────────────────────────────
    patches_html = ""
    for p in patches:
        a = p.get("analysis", {})
        is_evidence = p.get("is_concrete_evidence")
        label_bg = "#ecfdf5" if is_evidence else "#f8fafc"
        label_color = "#059669" if is_evidence else "#6b7280"
        label_text = "Baseline Updated" if is_evidence else "Conversation Layer"
        patches_html += f'''<div style="background:{label_bg};border-radius:6px;padding:12px 14px;margin-bottom:8px">
  <div style="font-family:-apple-system,sans-serif;font-size:11px;font-weight:600;color:{label_color};margin-bottom:4px">{label_text} &middot; {p.get('timestamp','')[:10]} &middot; {p.get('source','')}</div>
  <div style="font-size:13px;color:#334155;line-height:1.6">{a.get('what_changed', p.get('content_preview',''))}</div>
</div>'''

    # ── Build section content blocks ──────────────────────────────────────

    # MACRO section content
    macro_content = f'''
<p style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:16px">{_safe(macro, 'macro_summary')}</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div style="background:#f0fdf4;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#059669;margin-bottom:8px">Tailwinds</div>
    {_helper("Factors in the broader market or economy working in this stock's favour.")}
    {_list_items(macro.get('macro_tailwinds'), 'None identified')}
  </div>
  <div style="background:#fef2f2;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#dc2626;margin-bottom:8px">Headwinds</div>
    {_helper("Factors in the broader market or economy working against this stock.")}
    {_list_items(macro.get('macro_headwinds'), 'None identified')}
  </div>
</div>
<div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Geopolitical &amp; Regulatory Risks</div>
  {_helper("Political events, trade policies, or regulations that could directly affect this company.")}
  {_list_items(macro.get('geopolitical_risks'), 'None identified')}
</div>'''

    # FOUNDATION section content
    foundation_content = f'''
<p style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:16px">{_safe(foundation, 'foundation_summary')}</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Competitive Moat</div>
    {_helper("A moat is what protects a company from competitors — like a patent, brand loyalty, or technology others can't easily copy.")}
    <p style="font-size:14px;color:#334155;line-height:1.7;margin:0">{_safe(foundation, 'moat', 'competitive_advantage')[:300]}</p>
  </div>
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Asymmetry</div>
    {_helper("Is the potential upside much larger than the downside? Good trades are asymmetric — risk a little to potentially gain a lot.")}
    <p style="font-size:14px;color:#334155;line-height:1.7;margin:0">{_safe(foundation, 'asymmetry', 'asymmetry_summary')[:300]}</p>
  </div>
</div>
<div>
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Upcoming Catalysts</div>
  {_helper("A catalyst is a specific event — earnings, product launch, regulatory approval — that could cause significant stock movement.")}
  {catalysts_html}
</div>'''

    # VALUATION section content
    valuation_content = f'''
<p style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:16px">{_safe(valuation, 'valuation_summary')}</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Vs. Peers</div>
    {_helper("How expensive or cheap is this stock compared to similar companies?")}
    <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px 0">{(_safe(valuation, 'peer_comparison', 'relative_valuation') or '').upper()}</p>
    <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0">{_safe(valuation, 'peer_comparison', 'peer_summary')[:200]}</p>
  </div>
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Rule of 40</div>
    {_helper("A health check for growth companies: revenue growth % + profit margin %. Above 40 = healthy business.")}
    <p style="font-size:22px;font-weight:800;color:#0f172a;margin:4px 0;font-family:-apple-system,sans-serif">{_safe(valuation, 'rule_of_40', 'score')}</p>
    <p style="font-size:13px;color:#64748b;margin:0">Trend: {_safe(valuation, 'rule_of_40', 'trajectory')}</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Insider Alignment</div>
    {_helper("When executives own a lot of company stock, their interests are aligned with yours.")}
    <p style="font-size:13px;color:#334155;line-height:1.6;margin:0">{_safe(valuation, 'insider_alignment', 'notes')[:200]}</p>
  </div>
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Dilution Risk</div>
    {_helper("Dilution happens when a company issues new shares, reducing the value of existing shares.")}
    <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px 0">{_safe(valuation, 'dilution_risk', 'risk_level')}</p>
    <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0">{_safe(valuation, 'dilution_risk', 'notes')[:150]}</p>
  </div>
</div>'''

    # RISK section content
    risk_content = f'''
<p style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:16px">{_safe(risk, 'risk_summary')}</p>
<div style="margin-bottom:16px">
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Key Risks</div>
  {_helper("Each risk is rated by severity. Critical = could break the thesis. High = material. Medium = worth watching.")}
  {risks_html}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div style="background:#fef2f2;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#dc2626;margin-bottom:6px">Short Thesis (Bear Case)</div>
    {_helper("The strongest argument for why this stock could go down. Short sellers profit when stocks fall.")}
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0">{_safe(risk, 'short_thesis', 'bear_case')[:300]}</p>
  </div>
  <div style="background:#fffbeb;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#b45309;margin-bottom:6px">Bull Case Critique</div>
    {_helper("Even if the optimistic case sounds great, what might the market already know that you don't?")}
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0">{_safe(risk, 'bull_case_critique')[:300]}</p>
  </div>
</div>'''

    # BULL VS BEAR section content
    thesis_killers_html = _list_items(verdict.get("thesis_killers"))
    bull_bear_content = f'''
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 18px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#059669;margin-bottom:8px">Bull Case</div>
    <p style="font-size:14px;color:#1e293b;line-height:1.7;margin:0">{_safe(verdict, 'bull_synthesis')[:400]}</p>
  </div>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 18px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#dc2626;margin-bottom:8px">Bear Case</div>
    <p style="font-size:14px;color:#1e293b;line-height:1.7;margin:0">{_safe(verdict, 'bear_synthesis')[:400]}</p>
  </div>
</div>
<div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
  <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ef4444;margin-bottom:6px">Thesis Killers</div>
  {_helper("Specific events that would completely invalidate the investment case.")}
  {thesis_killers_html}
</div>'''

    # TECHNICALS section content
    technicals_content = f'''
<p style="font-size:15px;color:#334155;line-height:1.75;margin-bottom:16px">{_safe(technicals, 'technicals_summary')}</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Key Price Levels</div>
    {_helper("Resistance = price ceiling where selling increases. Support = price floor where buying emerges.")}
    <div style="margin-top:8px">
      <div style="font-size:12px;font-weight:600;color:#dc2626;font-family:-apple-system,sans-serif;margin-bottom:4px">RESISTANCE</div>
      {_list_items(technicals.get('key_levels', {}).get('immediate_resistance', []), 'See chart')}
    </div>
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:600;color:#059669;font-family:-apple-system,sans-serif;margin-bottom:4px">SUPPORT</div>
      {_list_items(technicals.get('key_levels', {}).get('immediate_support', []), 'See chart')}
    </div>
  </div>
  <div>
    <div style="background:#f8fafc;border-radius:6px;padding:14px 16px;margin-bottom:12px">
      <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Trend</div>
      <p style="font-size:16px;font-weight:700;color:#1e293b;margin:0;text-transform:capitalize">{_safe(technicals, 'moving_averages', 'trend')}</p>
      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0">{_safe(technicals, 'moving_averages', 'notes')[:120]}</p>
    </div>
    <div style="background:#f8fafc;border-radius:6px;padding:14px 16px">
      <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Short Interest</div>
      {_helper("Measures how many investors are betting the stock falls. High short interest + positive catalyst = potential short squeeze.")}
      <p style="font-size:14px;color:#334155;margin:4px 0 0 0">Squeeze potential: <strong>{_safe(technicals, 'short_interest', 'squeeze_potential')}</strong></p>
    </div>
  </div>
</div>'''

    # ── Assemble the full HTML ────────────────────────────────────────────
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    padding: 24px 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }}
  .page {{
    max-width: 640px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }}
  /* no interactive elements needed */
</style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <div style="background:#0f172a;padding:32px 32px 28px">
    <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;margin-bottom:16px">Research Report &middot; {date_str}</div>
    <div style="font-size:42px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1">{ticker}</div>
  </div>

  <!-- ═══ VERDICT BANNER — always visible ═══ -->
  <div style="background:{vbg};border-bottom:2px solid {vborder};padding:24px 32px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <span style="display:inline-block;background:{vcolor};color:#fff;font-size:13px;font-weight:800;letter-spacing:0.08em;padding:8px 20px;border-radius:4px">{verdict_label}</span>
      <span style="font-size:15px;color:#64748b;font-weight:500">Conviction <strong style="color:#0f172a;font-size:20px">{conviction}</strong><span style="color:#94a3b8">/10</span></span>
    </div>
    <p style="font-size:16px;color:#1e293b;line-height:1.75;margin:0">{_safe(verdict, 'verdict_rationale', default=_safe(verdict, 'verdict_summary'))[:500]}</p>
  </div>

  <!-- ═══ SCORECARD ═══ -->
  <div style="display:flex;padding:20px 32px;border-bottom:1px solid #e2e8f0;gap:0">
    {_score_bar(f_score, 'Foundation')}
    {_score_bar(v_score, 'Valuation')}
    {_score_bar(r_score, 'Risk')}
    {_score_bar(t_score, 'Technicals')}
  </div>

  <!-- ═══ TRADE SETUP — always visible ═══ -->
  <div style="padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:14px">Action Plan</div>

    <!-- Price targets row -->
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#059669;margin-bottom:4px">Base Target</div>
        <div style="font-size:22px;font-weight:800;color:#059669">${base_price}</div>
      </div>
      <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;margin-bottom:4px">Bull Target</div>
        <div style="font-size:22px;font-weight:800;color:#10b981">${bull_price}</div>
      </div>
      <div style="flex:1;background:#fef2f2;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#ef4444;margin-bottom:4px">Bear Target</div>
        <div style="font-size:22px;font-weight:800;color:#ef4444">${bear_price}</div>
      </div>
    </div>

    <!-- Key metrics row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
      <div style="background:#f8fafc;border-radius:6px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:2px">Entry Zone</div>
        {_helper("The ideal price range to start a position, based on technical support and valuation.")}
        <div style="font-size:16px;font-weight:700;color:#0f172a">{entry_zone}</div>
      </div>
      <div style="background:#f8fafc;border-radius:6px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:2px">Stop Loss</div>
        {_helper("The price at which you exit if the thesis breaks down. Your predefined maximum loss.")}
        <div style="font-size:16px;font-weight:700;color:#ef4444">{stop_label}</div>
      </div>
      <div style="background:#f8fafc;border-radius:6px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:2px">Risk/Reward</div>
        {_helper("Potential gain vs. potential loss. 3:1 means for every $1 at risk, you could gain $3. Aim for 2:1+.")}
        <div style="font-size:16px;font-weight:700;color:#0f172a">{rr_ratio}</div>
      </div>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.65;margin:0;padding:10px 12px;background:#f8fafc;border-radius:6px">{_safe(trade, 'trade_summary')[:350]}</p>
  </div>

  <!-- ═══ DEEP DIVE SECTIONS (collapsible) ═══ -->
  <div style="padding:0 32px">
    <div style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;padding:20px 0 0 0">Deep Dive</div>

    {_section_block("Step 1", "Market &amp; Sector Context", macro_content)}
    {_section_block("Step 2", "Business Quality &amp; Foundation", foundation_content)}
    {_section_block("Step 3", "Valuation &amp; Financials", valuation_content)}
    {_section_block("Step 4", "Risk &amp; Red Teaming", risk_content)}
    {_section_block("Step 5", "Bull vs Bear", bull_bear_content)}
    {_section_block("Step 6", "Technical Analysis", technicals_content)}
  </div>

  <!-- ═══ PATCH LOG ═══ -->
  {"<div style='padding:20px 32px;border-top:1px solid #e2e8f0'><div style=\"font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:12px\">Update Log</div>" + patches_html + "</div>" if patches else ""}

  <!-- ═══ FOOTER ═══ -->
  <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0">
      Trading Bot Research &middot; {date_str}<br>
      Generated automatically for personal research purposes only.<br>
      <strong style="color:#64748b">Not financial advice. Always do your own due diligence.</strong>
    </p>
  </div>

</div>
</body>
</html>"""

    return html


def send_report(report: dict) -> bool:
    ticker = report.get("ticker", "UNKNOWN")
    date = datetime.now().strftime("%Y-%m-%d")
    recipients = get_recipients()

    if not recipients:
        print("  No recipients configured. Add emails from the dashboard.")
        return False

    html_body = build_html_report(report)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Research Report — ${ticker} — {date}"
    msg["From"] = EMAIL_SENDER
    msg["To"] = EMAIL_SENDER

    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_SENDER, recipients, msg.as_string())
        print(f"  Report sent to: {', '.join(recipients)}")
        return True
    except Exception as e:
        print(f"  Email error: {e}")
        return False
