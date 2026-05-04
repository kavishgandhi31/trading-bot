/**
 * "How much" tab — Kelly sanity-check rendered as a side-by-side comparison.
 *
 * The model picks a position size from posture (e.g. "deploy_partial → 50%"),
 * then estimates win probability + payoff and computes what classical
 * fractional-Kelly sizing math would suggest. We surface both numbers so the
 * user can see whether the recommendation lines up with first-principles math.
 *
 * The disclaimer is non-negotiable: these are model judgements, not statistics.
 */

import type { HowToBuy } from "../types";
import DisclaimerLine from "../DisclaimerLine";

export default function SizingMathTab({ plan }: { plan: HowToBuy }) {
  const m = plan.sizing_math;
  if (!m) {
    return (
      <div className="text-sm text-slate-500 italic">
        Sizing math wasn&apos;t generated for this report.
      </div>
    );
  }

  const postureValue = `${plan.total_allocation_pct}%`;
  const mathValue = m.fractional_kelly_recommendation_pct
    ? `${m.fractional_kelly_recommendation_pct}%`
    : "—";

  return (
    <div className="space-y-5">
      <ComparisonCards
        postureValue={postureValue}
        mathValue={mathValue}
        fullKellyPct={m.kelly_fraction_pct}
        agrees={m.agrees_with_posture}
      />

      {!m.agrees_with_posture && m.disagreement_note && (
        <div className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {m.disagreement_note}
        </div>
      )}

      <InputsRow
        winProb={m.estimated_win_probability_pct}
        avgWin={m.estimated_avg_win_pct}
        avgLoss={m.estimated_avg_loss_pct}
      />

      <DisclaimerLine>{m.disclaimer}</DisclaimerLine>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ComparisonCards({
  postureValue,
  mathValue,
  fullKellyPct,
  agrees,
}: {
  postureValue: string;
  mathValue: string;
  fullKellyPct: string;
  agrees: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Card
        label="What the recommendation says"
        value={postureValue}
        sub="of the money set aside for this stock"
      />
      <Card
        label="What the math says (cautious version)"
        value={mathValue}
        sub={`(aggressive math version: ${fullKellyPct || "—"}%)`}
        topRight={<AgreementBadge agrees={agrees} />}
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  topRight,
}: {
  label: string;
  value: string;
  sub: string;
  topRight?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        {topRight}
      </div>
      <div className="text-3xl font-extrabold text-slate-900 leading-none">
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-1.5">{sub}</div>
    </div>
  );
}

function AgreementBadge({ agrees }: { agrees: boolean }) {
  if (agrees) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Math agrees
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Math disagrees
    </span>
  );
}

function InputsRow({
  winProb,
  avgWin,
  avgLoss,
}: {
  winProb: number;
  avgWin: string;
  avgLoss: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat
        label="Chance of being right"
        value={`${winProb}%`}
        hint="Model's best guess. Not historical."
      />
      <Stat
        label="If right, you'd gain"
        value={`${avgWin || "—"}%`}
        tone="emerald"
      />
      <Stat
        label="If wrong, you'd lose"
        value={`${avgLoss || "—"}%`}
        tone="red"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
  hint?: string;
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-600"
      : "text-slate-900";
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      {hint && (
        <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}
