"use client";

import HelperText from "../HelperText";

interface Catalyst {
  catalyst: string;
  timeline: string;
  rating: string;
  impact: string;
}

const RATING_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  high: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  strategic: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
};

const DEFAULT_STYLE = { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200" };

export default function FoundationSection({
  foundation,
}: {
  foundation: Record<string, unknown>;
}) {
  const moat = foundation.moat as Record<string, unknown> | undefined;
  const asymmetry = foundation.asymmetry as Record<string, unknown> | undefined;
  const catalysts = (foundation.catalysts as Catalyst[]) || [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-7">
        {(foundation.foundation_summary as string) || "Not available"}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Competitive Moat
          </div>
          <HelperText text="A moat protects a company from competitors — like a patent, brand loyalty, or tech others can't easily copy." />
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            {(moat?.competitive_advantage as string)?.slice(0, 300) || "N/A"}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
            Asymmetry
          </div>
          <HelperText text="Is the potential upside much larger than the downside? Good trades are asymmetric." />
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            {(asymmetry?.asymmetry_summary as string)?.slice(0, 300) || "N/A"}
          </p>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">
          Upcoming Catalysts
        </div>
        <HelperText text="A catalyst is a specific event — earnings, product launch, regulatory approval — that could cause significant stock movement." />
        <div className="mt-3 space-y-0 divide-y divide-slate-100">
          {catalysts.length === 0 && (
            <p className="text-sm text-slate-400 italic">No catalysts identified.</p>
          )}
          {catalysts.map((cat, i) => {
            const style =
              RATING_STYLES[cat.rating?.toLowerCase()] || DEFAULT_STYLE;
            return (
              <div key={i} className="py-3">
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wide ${style.text} ${style.bg} border ${style.border} px-2 py-0.5 rounded mb-1.5`}
                >
                  {cat.rating}
                </span>
                <div className="text-sm font-semibold text-slate-800">
                  {cat.catalyst}
                </div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {cat.timeline} — {cat.impact?.slice(0, 200)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
