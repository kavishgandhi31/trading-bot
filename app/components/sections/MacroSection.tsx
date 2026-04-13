"use client";

import HelperText from "../HelperText";

function Items({ items, fallback = "None identified" }: { items?: string[]; fallback?: string }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400 italic">{fallback}</p>;
  }
  return (
    <ul className="mt-2 space-y-1.5 pl-4 list-disc text-sm text-slate-600 leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function MacroSection({ macro }: { macro: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-7">
        {(macro.macro_summary as string) || "Not available"}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mb-1">
            Tailwinds
          </div>
          <HelperText text="Factors in the broader market or economy working in this stock's favour." />
          <Items items={macro.macro_tailwinds as string[]} />
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-1">
            Headwinds
          </div>
          <HelperText text="Factors in the broader market or economy working against this stock." />
          <Items items={macro.macro_headwinds as string[]} />
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
          Geopolitical & Regulatory Risks
        </div>
        <HelperText text="Political events, trade policies, or regulations that could directly affect this company." />
        <Items items={macro.geopolitical_risks as string[]} />
      </div>
    </div>
  );
}
