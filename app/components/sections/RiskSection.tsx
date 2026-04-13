"use client";

import HelperText from "../HelperText";

interface Risk {
  risk: string;
  severity: string;
  detail: string;
}

const DOT_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-slate-400",
};

export default function RiskSection({ risk }: { risk: Record<string, unknown> }) {
  const risks = (risk.skeptic_risks as Risk[]) || [];
  const shortThesis = risk.short_thesis as Record<string, unknown> | undefined;
  const bullCritique = risk.bull_case_critique as string | undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-7">
        {(risk.risk_summary as string) || "Not available"}
      </p>

      <div>
        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">
          Key Risks
        </div>
        <HelperText text="Each risk is rated by severity. Critical = could break the thesis. High = material. Medium = worth watching." />
        <div className="mt-3 divide-y divide-slate-100">
          {risks.length === 0 && (
            <p className="text-sm text-slate-400 italic">No specific risks identified.</p>
          )}
          {risks.map((r, i) => {
            const dotColor = DOT_COLORS[r.severity?.toLowerCase()] || "bg-slate-300";
            return (
              <div key={i} className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                  <span className="text-sm font-semibold text-slate-800">
                    {r.risk}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {r.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-4">
                  {r.detail?.slice(0, 250)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-1">
            Short Thesis (Bear Case)
          </div>
          <HelperText text="The strongest argument for why this stock could go down." />
          <p className="text-xs text-slate-700 leading-relaxed mt-2">
            {(shortThesis?.bear_case as string)?.slice(0, 300) || "N/A"}
          </p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-amber-600 mb-1">
            Bull Case Critique
          </div>
          <HelperText text="Even if the optimistic case sounds great, what might the market already know?" />
          <p className="text-xs text-slate-700 leading-relaxed mt-2">
            {bullCritique?.slice(0, 300) || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
