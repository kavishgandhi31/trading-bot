"use client";

import HelperText from "../HelperText";

export default function ValuationSection({
  valuation,
}: {
  valuation: Record<string, unknown>;
}) {
  const peers = valuation.peer_comparison as Record<string, unknown> | undefined;
  const rule40 = valuation.rule_of_40 as Record<string, unknown> | undefined;
  const insider = valuation.insider_alignment as Record<string, unknown> | undefined;
  const dilution = valuation.dilution_risk as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-7">
        {(valuation.valuation_summary as string) || "Not available"}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Vs. Peers
          </div>
          <HelperText text="How expensive or cheap is this stock compared to similar companies?" />
          <p className="text-sm font-semibold text-slate-800 mt-2 uppercase">
            {(peers?.relative_valuation as string) || "N/A"}
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {(peers?.peer_summary as string)?.slice(0, 200)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Rule of 40
          </div>
          <HelperText text="Revenue growth % + profit margin %. Above 40 = healthy growth company." />
          <p className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
            {String(rule40?.score ?? "N/A")}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Trend: {String(rule40?.trajectory ?? "N/A")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Insider Alignment
          </div>
          <HelperText text="When executives own a lot of company stock, their interests are aligned with yours." />
          <p className="text-xs text-slate-600 leading-relaxed mt-2">
            {(insider?.notes as string)?.slice(0, 200) || "N/A"}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Dilution Risk
          </div>
          <HelperText text="Dilution happens when a company issues new shares, reducing the value of existing shares." />
          <p className="text-sm font-semibold text-slate-800 mt-2">
            {(dilution?.risk_level as string) || "N/A"}
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {(dilution?.notes as string)?.slice(0, 150)}
          </p>
        </div>
      </div>
    </div>
  );
}
