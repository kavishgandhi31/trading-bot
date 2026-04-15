"use client";

import HelperText from "./HelperText";

function safe(obj: Record<string, unknown>, ...keys: string[]): string {
  let val: unknown = obj;
  for (const k of keys) {
    if (typeof val !== "object" || val === null) return "N/A";
    val = (val as Record<string, unknown>)[k];
  }
  return val != null && val !== "" ? String(val) : "N/A";
}

// Strip any leading "$" so we never double-prefix when the LLM already included it.
function stripDollar(v: unknown): string {
  return String(v ?? "").replace(/^\s*\$\s*/, "");
}

export default function TradeSetup({
  trade,
}: {
  trade: Record<string, unknown>;
}) {
  const entryZone = trade.entry_zone as Record<string, unknown> | undefined;
  const stopLoss = trade.stop_loss as Record<string, unknown> | undefined;
  const targets = trade.price_targets as Record<string, unknown> | undefined;
  const base = targets?.base as Record<string, unknown> | undefined;
  const bull = targets?.bull as Record<string, unknown> | undefined;
  const bear = targets?.bear as Record<string, unknown> | undefined;

  const entryLow = entryZone?.low ? `$${stripDollar(entryZone.low)}` : "N/A";
  const entryHigh = entryZone?.high ? `$${stripDollar(entryZone.high)}` : "";
  const entryStr =
    entryLow !== "N/A" && entryHigh ? `${entryLow} – ${entryHigh}` : entryLow;
  const stopStr = stopLoss?.price ? `$${stripDollar(stopLoss.price)}` : "N/A";
  const rrRatio = safe(trade, "risk_reward_ratio");

  return (
    <div className="px-8 py-6 border-b border-slate-200">
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-4">
        Action Plan
      </div>

      {/* Price targets */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-lg p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">
            Base Target
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            ${stripDollar(safe(base ?? {}, "price"))}
          </div>
          <div className="text-xs text-emerald-700/60 mt-1 line-clamp-2">
            {safe(base ?? {}, "catalyst").slice(0, 80)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
            Bull Target
          </div>
          <div className="text-2xl font-extrabold text-green-600">
            ${stripDollar(safe(bull ?? {}, "price"))}
          </div>
          <div className="text-xs text-green-700/60 mt-1 line-clamp-2">
            {safe(bull ?? {}, "catalyst").slice(0, 80)}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1">
            Bear Target
          </div>
          <div className="text-2xl font-extrabold text-red-500">
            ${stripDollar(safe(bear ?? {}, "price"))}
          </div>
          <div className="text-xs text-red-500/60 mt-1 line-clamp-2">
            {safe(bear ?? {}, "catalyst").slice(0, 80)}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Entry Zone
          </div>
          <HelperText text="The ideal price range to start a position, based on technical support and valuation." />
          <div className="text-lg font-bold text-slate-900">{entryStr}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Stop Loss
          </div>
          <HelperText text="The price at which you exit if the thesis breaks down. Your predefined max loss." />
          <div className="text-lg font-bold text-red-500">{stopStr}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Risk / Reward
          </div>
          <HelperText text="Potential gain vs loss. 3:1 means for every $1 at risk you could gain $3." />
          <div className="text-lg font-bold text-slate-900">{rrRatio}</div>
        </div>
      </div>

      {/* Summary */}
      {typeof trade.trade_summary === "string" && (
        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 rounded-lg px-4 py-3">
          {trade.trade_summary}
        </p>
      )}
    </div>
  );
}
