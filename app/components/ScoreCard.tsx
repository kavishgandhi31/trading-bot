"use client";

function scoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-blue-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-500";
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const pct = Math.min(score * 10, 100);
  return (
    <div className="flex-1 text-center px-3">
      <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-3xl font-extrabold text-slate-900 font-mono">
        {score}
      </div>
      <div className="mt-1.5 mx-auto w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ScoreCard({
  scores,
}: {
  scores: { foundation: number; valuation: number; risk: number; technicals: number };
}) {
  return (
    <div className="flex divide-x divide-slate-200 py-5 px-8 border-b border-slate-200">
      <ScoreItem label="Foundation" score={scores.foundation} />
      <ScoreItem label="Valuation" score={scores.valuation} />
      <ScoreItem label="Risk" score={scores.risk} />
      <ScoreItem label="Technicals" score={scores.technicals} />
    </div>
  );
}
