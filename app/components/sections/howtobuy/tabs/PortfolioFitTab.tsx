/**
 * "Your portfolio" tab — tells the user whether adding this stock makes sense
 * given everything else they already own. If they haven't entered any
 * portfolio holdings on the dashboard, the tab degrades gracefully with a
 * deep-link prompt and generic guidance.
 */

import type { PortfolioFit } from "../types";

const RISK_META: Record<
  PortfolioFit["concentration_risk"],
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: "Low risk of overconcentration",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  moderate: {
    label: "Moderate risk of overconcentration",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  high: {
    label: "High risk of overconcentration",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

const FIT_META: Record<
  PortfolioFit["diversification_fit"],
  { label: string; text: string }
> = {
  additive: { label: "Adds something new", text: "text-emerald-700" },
  redundant: { label: "Doubles up what you have", text: "text-amber-700" },
  hedging: { label: "Balances what you have", text: "text-blue-700" },
};

export default function PortfolioFitTab({ data }: { data: PortfolioFit }) {
  const risk = RISK_META[data.concentration_risk] ?? RISK_META.moderate;
  const fit = FIT_META[data.diversification_fit] ?? FIT_META.additive;

  return (
    <div className="space-y-5">
      {!data.using_user_context && <NoPortfolioBanner />}

      <div className="pt-1">
        <Pills risk={risk} fit={fit} />
      </div>

      <ChecksGrid data={data} />

      {data.thematic_overlap &&
        (data.thematic_overlap.themes?.length > 0 || data.thematic_overlap.notes) && (
          <ThematicCard data={data.thematic_overlap} />
        )}

      {data.recommended_allocation_adjustment_pct >= 0 && (
        <AdjustedRecommendation data={data} />
      )}

      {data.portfolio_fit_summary && (
        <p className="text-sm text-slate-700 leading-7 bg-slate-50 rounded-xl px-5 py-4">
          {data.portfolio_fit_summary}
        </p>
      )}

      {data.out_of_scope_warnings?.length > 0 && (
        <OutOfScope warnings={data.out_of_scope_warnings} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function NoPortfolioBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900 leading-7">
      You haven&apos;t entered your holdings yet — this is generic guidance.{" "}
      <span className="text-blue-700 font-semibold">
        Add your holdings on the dashboard to get a personalized check.
      </span>
    </div>
  );
}

type RiskMeta = (typeof RISK_META)[keyof typeof RISK_META];
type FitMeta = (typeof FIT_META)[keyof typeof FIT_META];

function Pills({ risk, fit }: { risk: RiskMeta; fit: FitMeta }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${risk.bg} ${risk.text} ${risk.border}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {risk.label}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 ${fit.text} border border-slate-200`}
      >
        {fit.label}
      </span>
    </div>
  );
}

function ChecksGrid({ data }: { data: PortfolioFit }) {
  const single = data.single_position_check;
  const sector = data.sector_overlap_check;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CheckCard
        label="Single position size"
        violates={single.violates_user_cap}
        notes={single.notes}
      />
      <CheckCard
        label="Sector exposure"
        violates={sector.violates_user_cap}
        notes={sector.notes}
        topRight={
          <SectorBadge
            current={sector.current_sector_exposure_pct}
            after={sector.post_add_sector_exposure_pct}
          />
        }
        chips={sector.overlapping_holdings}
      />
    </div>
  );
}

function CheckCard({
  label,
  violates,
  notes,
  topRight,
  chips,
}: {
  label: string;
  violates: boolean;
  notes: string;
  topRight?: React.ReactNode;
  chips?: string[];
}) {
  const cardClass = violates
    ? "bg-red-50/50 border-red-200"
    : "bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-xl border p-4 ${cardClass}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        {topRight}
      </div>
      {violates && (
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 mb-1.5">
          Above your stated cap
        </div>
      )}
      <p className="text-sm text-slate-700 leading-7">{notes}</p>
      {chips && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((t) => (
            <span
              key={t}
              className="inline-block bg-white border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectorBadge({ current, after }: { current: string; after: string }) {
  // Only render when both values look like real numbers — otherwise the model
  // returned a description ("unknown") and we'd render junk like "unknown%".
  const isNumeric = (v: unknown) =>
    typeof v === "number" ||
    (typeof v === "string" && /^\s*\d/.test(v) && v.length < 12);
  if (!isNumeric(current) || !isNumeric(after)) return null;
  return (
    <div className="text-[11px] font-mono text-slate-700 whitespace-nowrap shrink-0">
      {String(current).replace(/%$/, "")}% →{" "}
      <span className="font-bold">{String(after).replace(/%$/, "")}%</span>
    </div>
  );
}

function ThematicCard({
  data,
}: {
  data: PortfolioFit["thematic_overlap"];
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2.5">
        Theme overlap
      </div>
      {data.themes?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.themes.map((t, i) => (
            <span
              key={i}
              className="inline-block bg-violet-50 border border-violet-200 rounded-md px-2 py-0.5 text-[11.5px] font-semibold text-violet-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {data.notes && (
        <p className="text-sm text-slate-700 leading-7">{data.notes}</p>
      )}
    </div>
  );
}

function AdjustedRecommendation({ data }: { data: PortfolioFit }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 mb-2">
        Recommended size for your portfolio
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold text-emerald-700 leading-none">
          {data.recommended_allocation_adjustment_pct}%
        </span>
        <span className="text-[12.5px] text-slate-500">
          of money set aside for this stock
        </span>
      </div>
      <p className="text-sm text-slate-700 leading-7">
        {data.adjustment_rationale}
      </p>
    </div>
  );
}

function OutOfScope({ warnings }: { warnings: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2.5">
        We can&apos;t see — consider these yourself
      </div>
      <ul className="text-sm text-slate-500 leading-7 list-disc pl-5 space-y-1">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
