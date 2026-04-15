"use client";

import { useState, useEffect } from "react";
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
import ChatPanel from "@/app/components/ChatPanel";

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

  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat") === "1") setChatOpen(true);
  }, []);

  const verdictKey = (report.verdict?.net_verdict as string) || "hold";
  const conviction = report.verdict?.conviction_score ?? "—";
  const verdictMeta: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    strong_buy: { label: "Strong Buy", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/20" },
    buy: { label: "Buy", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/20" },
    hold: { label: "Hold", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-400/20" },
    sell: { label: "Sell", dot: "bg-red-400", text: "text-red-300", bg: "bg-red-500/10", border: "border-red-400/20" },
    strong_sell: { label: "Strong Sell", dot: "bg-red-400", text: "text-red-300", bg: "bg-red-500/10", border: "border-red-400/20" },
  };
  const vm = verdictMeta[verdictKey] ?? verdictMeta.hold;

  return (
    <>
      {/* Header */}
      <header className="relative bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden">
        {/* Soft emerald glow */}
        <div
          aria-hidden
          className="absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-[0.18]"
          style={{ background: "radial-gradient(circle, #059669 0%, transparent 60%)" }}
        />
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Main header */}
        <div className="relative px-8 pt-8 pb-8">
          <div className="flex items-end justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.15em] uppercase text-slate-400 mb-2">
                Research Report
              </div>
              <h1 className="text-5xl font-extrabold text-white tracking-tight leading-none">
                {report.ticker}
              </h1>
              <p className="text-slate-400 text-[13px] mt-3">
                7-stage AI analysis · debate the thesis with Claude
              </p>
            </div>

            {/* Verdict status pill */}
            <div className={`flex items-center gap-3 ${vm.bg} ${vm.border} border rounded-xl px-4 py-2.5 shrink-0`}>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${vm.dot}`} />
                <span className={`text-sm font-bold tracking-wide ${vm.text}`}>
                  {vm.label}
                </span>
              </span>
              <span className="w-px h-5 bg-white/10" />
              <span className="flex items-baseline gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Conv</span>
                <span className="text-lg font-extrabold text-white leading-none">{String(conviction)}</span>
                <span className="text-xs text-slate-500 font-mono">/10</span>
              </span>
            </div>
          </div>
        </div>

        {/* Thin emerald accent line */}
        <div
          aria-hidden
          className="relative h-px bg-gradient-to-r from-transparent via-emerald-600/50 to-transparent"
        />
      </header>

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

      {chatOpen && <ChatPanel ticker={report.ticker} onClose={() => setChatOpen(false)} />}
    </>
  );
}
