"use client";

/**
 * Top-level layout for a single report.
 *
 * Three zones, top to bottom:
 *   1. Hero  — verdict + plain-English rationale + Right Now strip + grade card
 *   2. How to buy — the actionable plan, the centerpiece of the report
 *   3. Deep dive — collapsible research sections (kept here for now; will
 *      become a side drawer in the next ship)
 *
 * A sticky context strip pinned to the top of the viewport keeps the verdict
 * + Right Now sentence visible the whole time the user scrolls.
 *
 * The previous standalone Trade Setup section was deleted in this refactor:
 * its data (entry zone, stop, targets) is now expressed by the buy ladder's
 * caps and tranches in the How To Buy section, so duplicating it created
 * cognitive load for no extra information.
 */

import { useState } from "react";
import CollapsibleSection from "@/app/components/CollapsibleSection";
import MacroSection from "@/app/components/sections/MacroSection";
import FoundationSection from "@/app/components/sections/FoundationSection";
import ValuationSection from "@/app/components/sections/ValuationSection";
import RiskSection from "@/app/components/sections/RiskSection";
import BullBearSection from "@/app/components/sections/BullBearSection";
import TechnicalsSection from "@/app/components/sections/TechnicalsSection";
import ChatPanel from "@/app/components/ChatPanel";
import ReportActions from "@/app/components/ReportActions";
import HowToBuySection from "@/app/components/sections/howtobuy/HowToBuySection";
import type {
  HowToBuy,
  OptionsOverlay,
  PortfolioFit,
} from "@/app/components/sections/howtobuy/types";
import { parsePrice } from "@/app/components/sections/howtobuy/types";
import HeroSection from "@/app/components/sections/hero/HeroSection";
import StickyContext from "@/app/components/sections/hero/StickyContext";

interface Report {
  ticker: string;
  meta?: {
    generated_at?: string;
    current_price?: number | string | null;
    beta?: number | string | null;
    market_cap?: number | string | null;
  };
  macro: Record<string, unknown>;
  foundation: Record<string, unknown>;
  valuation: Record<string, unknown>;
  risk: Record<string, unknown>;
  technicals: Record<string, unknown>;
  verdict: Record<string, unknown>;
  trade_setup: Record<string, unknown>;
  how_to_buy?: Record<string, unknown>;
  options_overlay?: Record<string, unknown>;
  portfolio_fit?: Record<string, unknown>;
  patch_log: Array<Record<string, unknown>>;
}

export default function ReportView({
  report,
  date,
  slug,
}: {
  report: Report;
  date: string;
  slug: string;
}) {
  // Open the chat panel on initial render if `?chat=1` is in the URL. Using a
  // lazy initializer means we never call setState inside an effect.
  const [chatOpen, setChatOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("chat") === "1";
  });

  const scores = {
    foundation: (report.foundation?.foundation_score as number) ?? 0,
    valuation: (report.valuation?.valuation_score as number) ?? 0,
    risk: (report.risk?.risk_score as number) ?? 0,
    technicals: (report.technicals?.technicals_score as number) ?? 0,
  };

  const plan = report.how_to_buy as unknown as HowToBuy | undefined;
  const options = report.options_overlay as unknown as OptionsOverlay | undefined;
  const portfolioFit = report.portfolio_fit as unknown as PortfolioFit | undefined;
  const currentPrice = parsePrice(report.meta?.current_price);
  const bullTarget = parsePrice(
    (report.trade_setup as { price_targets?: { bull?: { price?: unknown } } })
      ?.price_targets?.bull?.price
  );

  return (
    <>
      <StickyContext
        ticker={report.ticker}
        verdict={report.verdict}
        plan={plan}
        currentPrice={currentPrice}
      />

      {/* ── Zone 1 — Hero ─────────────────────────────────────────────── */}
      <HeroSection
        ticker={report.ticker}
        date={date}
        verdict={report.verdict}
        scores={scores}
        plan={plan}
        currentPrice={currentPrice}
      />

      {/* Report-level actions live just below the hero so they're always
          one short scroll away, never hijacking attention from the verdict. */}
      <ReportActions slug={slug} ticker={report.ticker} variant="detail" />

      {/* ── Zone 2 — How to buy this ──────────────────────────────────── */}
      <HowToBuySection
        plan={plan}
        options={options}
        portfolioFit={portfolioFit}
        currentPrice={currentPrice}
        bullTarget={bullTarget}
      />

      {/* ── Zone 3 — Deep dive ────────────────────────────────────────── */}
      <div className="px-8 pb-2">
        <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400 pt-6 pb-3">
          Why this verdict
        </div>

        <CollapsibleSection label="Step 1" title="Market & Sector Context">
          <MacroSection macro={report.macro} />
        </CollapsibleSection>
        <CollapsibleSection label="Step 2" title="Business Quality & Foundation">
          <FoundationSection foundation={report.foundation} />
        </CollapsibleSection>
        <CollapsibleSection label="Step 3" title="Valuation & Financials">
          <ValuationSection valuation={report.valuation} />
        </CollapsibleSection>
        <CollapsibleSection label="Step 4" title="Risk & Red Teaming">
          <RiskSection risk={report.risk} />
        </CollapsibleSection>
        <CollapsibleSection label="Step 5" title="Bull vs Bear">
          <BullBearSection verdict={report.verdict} />
        </CollapsibleSection>
        <CollapsibleSection label="Step 6" title="Technical Analysis">
          <TechnicalsSection technicals={report.technicals} />
        </CollapsibleSection>
      </div>

      {/* ── Patch log ─────────────────────────────────────────────────── */}
      {report.patch_log.length > 0 && (
        <div className="px-8 py-5 border-t border-slate-200">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-3">
            Update log
          </div>
          {report.patch_log.map((p, i) => {
            const a = (p.analysis as Record<string, unknown>) || {};
            const isEvidence = p.is_concrete_evidence;
            return (
              <div
                key={i}
                className={`rounded-xl p-3 mb-2 ${
                  isEvidence ? "bg-emerald-50" : "bg-slate-50"
                }`}
              >
                <div
                  className={`text-[11px] font-semibold mb-1 ${
                    isEvidence ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {isEvidence ? "Baseline updated" : "Conversation layer"} ·{" "}
                  {String(p.timestamp ?? "").slice(0, 10)} ·{" "}
                  {String(p.source ?? "")}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {String(a.what_changed || p.content_preview || "")}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-t border-slate-200 px-8 py-6 text-center">
        <p className="text-[11.5px] text-slate-400 leading-relaxed">
          Trading Bot Research · {date}
          <br />
          Generated automatically for personal research purposes only.
          <br />
          <strong className="text-slate-500">
            Not financial advice. Always do your own due diligence.
          </strong>
        </p>
      </div>

      {/* Chat FAB */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-700 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2"
        >
          <span>💬</span>
          <span>Debate {report.ticker}</span>
        </button>
      )}

      {chatOpen && (
        <ChatPanel ticker={report.ticker} onClose={() => setChatOpen(false)} />
      )}
    </>
  );
}
