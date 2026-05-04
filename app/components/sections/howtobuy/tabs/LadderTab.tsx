/**
 * "Buy plan" tab — the long-form view of the same buy ladder shown above.
 * Where the ladder visual is a quick at-a-glance, this is the audit trail:
 * every step, every condition, every reason. Plus the take-profit plan and
 * the situations that would invalidate the whole thing.
 *
 * Pure presentational; no business logic here.
 */

import type { HowToBuy, TriggerType } from "../types";
import { stripDollar } from "../types";

const TRIGGER_LABEL: Record<TriggerType, string> = {
  limit: "Buy on dip",
  breakout: "Buy on breakout",
  post_catalyst: "After event",
  time_based: "On schedule",
};

const TRIGGER_DOT: Record<TriggerType, string> = {
  limit: "bg-emerald-500",
  breakout: "bg-blue-500",
  post_catalyst: "bg-amber-500",
  time_based: "bg-violet-500",
};

export default function LadderTab({ plan }: { plan: HowToBuy }) {
  const tranches = plan.tranches || [];
  const scaleOut = plan.scale_out || [];

  return (
    <div className="space-y-5">
      <BuyStepsTable tranches={tranches} />

      <SummaryGrid plan={plan} />

      {scaleOut.length > 0 && <ScaleOutTable scaleOut={scaleOut} />}

      {plan.reevaluate_triggers?.length > 0 && (
        <ReevaluateList triggers={plan.reevaluate_triggers} />
      )}
    </div>
  );
}

// ── Sub-sections ────────────────────────────────────────────────────────────

function BuyStepsTable({ tranches }: { tranches: HowToBuy["tranches"] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Buy steps ({tranches.length})
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">% of budget</th>
              <th className="text-left px-3 py-2">When</th>
              <th className="text-left px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {tranches.map((t, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                  ${stripDollar(t.price)}
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                  {t.pct_of_total}%
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span
                      className={`w-2 h-2 rounded-full ${TRIGGER_DOT[t.trigger_type] ?? TRIGGER_DOT.limit}`}
                    />
                    {TRIGGER_LABEL[t.trigger_type] ?? "Buy on dip"}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {t.condition}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-slate-600 leading-snug">
                  {t.rationale}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryGrid({ plan }: { plan: HowToBuy }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SummaryCard
        label="Event timing"
        value={plan.catalyst_timing || "no specific event"}
        valueClass="text-[12.5px] text-slate-700 leading-snug"
        hint="Whether to buy before, after, or split around an upcoming event."
      />
      <SummaryCard
        label="Cancel plan if price drops below"
        value={`$${stripDollar(plan.invalidation_price)}`}
        valueClass="text-base font-mono font-bold text-red-600"
      />
      <SummaryCard
        label="How easy to trade"
        value={liquidityLabel(plan.liquidity_flag)}
        valueClass="text-[12.5px] font-semibold text-slate-700 capitalize"
        hint="How tight the bid/ask spread is and how much volume the stock has."
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className={valueClass}>{value}</div>
      {hint && (
        <div className="text-[11px] text-slate-500 mt-1 leading-snug">{hint}</div>
      )}
    </div>
  );
}

function ScaleOutTable({ scaleOut }: { scaleOut: HowToBuy["scale_out"] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Take profit (sell some on the way up)
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">% of position to sell</th>
              <th className="text-left px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {scaleOut.map((s, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                  ${stripDollar(s.price)}
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                  {s.pct_of_position}%
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-slate-600 leading-snug">
                  {s.rationale}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReevaluateList({ triggers }: { triggers: string[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Look at this plan again if
      </div>
      <ul className="text-[12.5px] text-slate-600 leading-relaxed list-disc pl-5 space-y-1">
        {triggers.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function liquidityLabel(flag: HowToBuy["liquidity_flag"] | undefined): string {
  switch (flag) {
    case "ok":
      return "Easy to trade";
    case "thin":
      return "Use limit orders";
    case "illiquid":
      return "Hard to trade — small size only";
    default:
      return "Unknown";
  }
}
