"use client";

import VerdictBanner from "@/app/components/VerdictBanner";
import ScoreCard from "@/app/components/ScoreCard";
import TradeSetup from "@/app/components/TradeSetup";
import CollapsibleSection from "@/app/components/CollapsibleSection";
import MacroSection from "@/app/components/sections/MacroSection";
import FoundationSection from "@/app/components/sections/FoundationSection";
import ValuationSection from "@/app/components/sections/ValuationSection";
import RiskSection from "@/app/components/sections/RiskSection";
import BullBearSection from "@/app/components/sections/BullBearSection";
import TechnicalsSection from "@/app/components/sections/TechnicalsSection";

interface Report {
  ticker: string;
  macro: Record<string, unknown>;
  foundation: Record<string, unknown>;
  valuation: Record<string, unknown>;
  risk: Record<string, unknown>;
  technicals: Record<string, unknown>;
  verdict: Record<string, unknown>;
  trade_setup: Record<string, unknown>;
  patch_log: Array<Record<string, unknown>>;
}

export default function ReportView({
  report,
  date,
}: {
  report: Report;
  date: string;
}) {
  const scores = {
    foundation: (report.foundation?.foundation_score as number) ?? 0,
    valuation: (report.valuation?.valuation_score as number) ?? 0,
    risk: (report.risk?.risk_score as number) ?? 0,
    technicals: (report.technicals?.technicals_score as number) ?? 0,
  };

  return (
    <>
      {/* Header */}
      <div className="bg-slate-900 px-8 pt-8 pb-7">
        <div className="text-[11px] tracking-[0.15em] uppercase text-slate-500 mb-4">
          Research Report &middot; {date}
        </div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight">
          {report.ticker}
        </h1>
      </div>

      {/* Verdict — always visible */}
      <VerdictBanner verdict={report.verdict} />

      {/* Scores */}
      <ScoreCard scores={scores} />

      {/* Trade setup — always visible */}
      <TradeSetup trade={report.trade_setup} />

      {/* Deep dive sections */}
      <div className="px-8">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400 pt-5">
          Deep Dive
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

      {/* Patch log */}
      {report.patch_log.length > 0 && (
        <div className="px-8 py-5 border-t border-slate-200">
          <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-3">
            Update Log
          </div>
          {report.patch_log.map((p, i) => {
            const a = (p.analysis as Record<string, unknown>) || {};
            const isEvidence = p.is_concrete_evidence;
            return (
              <div
                key={i}
                className={`rounded-lg p-3 mb-2 ${isEvidence ? "bg-emerald-50" : "bg-slate-50"}`}
              >
                <div className={`text-[11px] font-semibold mb-1 ${isEvidence ? "text-emerald-600" : "text-slate-500"}`}>
                  {isEvidence ? "Baseline Updated" : "Conversation Layer"} &middot;{" "}
                  {String(p.timestamp ?? "").slice(0, 10)} &middot; {String(p.source ?? "")}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {String(a.what_changed || p.content_preview || "")}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Trading Bot Research &middot; {date}<br />
          Generated automatically for personal research purposes only.<br />
          <strong className="text-slate-500">Not financial advice. Always do your own due diligence.</strong>
        </p>
      </div>
    </>
  );
}
