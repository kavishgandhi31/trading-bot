"use client";

import HelperText from "../HelperText";

function Items({ items, fallback = "See chart" }: { items?: string[]; fallback?: string }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400 italic">{fallback}</p>;
  }
  return (
    <ul className="mt-1 space-y-1 pl-4 list-disc text-sm text-slate-600 leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function TechnicalsSection({
  technicals,
}: {
  technicals: Record<string, unknown>;
}) {
  const levels = technicals.key_levels as Record<string, unknown> | undefined;
  const mas = technicals.moving_averages as Record<string, unknown> | undefined;
  const si = technicals.short_interest as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-7">
        {(technicals.technicals_summary as string) || "Not available"}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">
            Key Price Levels
          </div>
          <HelperText text="Resistance = price ceiling. Support = price floor. These are the levels traders watch." />
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-red-500 mb-1">RESISTANCE</div>
            <Items items={levels?.immediate_resistance as string[]} />
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-emerald-600 mb-1">SUPPORT</div>
            <Items items={levels?.immediate_support as string[]} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
              Trend
            </div>
            <p className="text-lg font-bold text-slate-900 capitalize">
              {(mas?.trend as string) || "N/A"}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {(mas?.notes as string)?.slice(0, 120)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
              Short Interest
            </div>
            <HelperText text="How many investors are betting the stock falls. High + positive catalyst = potential squeeze." />
            <p className="text-sm text-slate-600 mt-1">
              Squeeze potential:{" "}
              <strong>{(si?.squeeze_potential as string) || "N/A"}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
