"use client";

/**
 * The right-hand "report card" in the hero — four numeric scores out of 10
 * for the pillars of analysis. Each row pairs the score with a plain-English
 * helper so beginners know what the number is grading.
 *
 * The little progress bar under the number gives a non-numeric sense of where
 * the score sits in its 0–10 range, color-coded by `app/design/scores.ts`.
 */

import { useState } from "react";
import { scoreMeta } from "@/app/design/scores";

interface Props {
  scores: {
    foundation: number;
    valuation: number;
    risk: number;
    technicals: number;
  };
}

export default function ScoreCard({ scores }: Props) {
  const rows: Array<{ label: string; value: number; helper: string }> = [
    {
      label: "Business quality",
      value: scores.foundation,
      helper: "Moat, competition, catalysts.",
    },
    {
      label: "Valuation",
      value: scores.valuation,
      helper: "Cheap or expensive vs peers.",
    },
    {
      label: "Risk",
      value: scores.risk,
      helper: "Bear case, dilution, concentration.",
    },
    {
      label: "Technicals",
      value: scores.technicals,
      helper: "Trend, support, resistance.",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-4">
        Report card
      </div>
      <div className="space-y-3.5">
        {rows.map((r) => (
          <Row key={r.label} {...r} />
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  const meta = scoreMeta(value);
  const pct = Math.max(0, Math.min(100, (Number(value) || 0) * 10));
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center justify-between gap-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-slate-900 leading-tight">
          {label}
        </div>
        <div
          className={`text-[11.5px] leading-snug transition-colors duration-150 ${
            hovered ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {helper}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-baseline gap-0.5 font-mono">
          <span className={`text-[20px] font-extrabold ${meta.text} leading-none`}>
            {value}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">/10</span>
        </div>
        <div
          className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden"
          title={`${value}/10 — ${meta.meaning}`}
        >
          <div
            className={`h-full rounded-full ${meta.fill}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
