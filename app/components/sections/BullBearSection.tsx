"use client";

import HelperText from "../HelperText";

function Items({ items }: { items?: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400 italic">None identified.</p>;
  }
  return (
    <ul className="mt-2 space-y-1.5 pl-4 list-disc text-sm text-slate-600 leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function BullBearSection({
  verdict,
}: {
  verdict: Record<string, unknown>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mb-2">
            Bull Case
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {(verdict.bull_synthesis as string)?.slice(0, 500) || "N/A"}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-2">
            Bear Case
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {(verdict.bear_synthesis as string)?.slice(0, 500) || "N/A"}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4">
        <div className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-1">
          Thesis Killers
        </div>
        <HelperText text="Specific events that would completely invalidate the investment case." />
        <Items items={verdict.thesis_killers as string[]} />
      </div>
    </div>
  );
}
