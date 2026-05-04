/**
 * "Options" tab — strategy cards with plain-English explanations.
 *
 * Each card shows: human-readable name, directional view (bullish / bearish /
 * neutral / vol bet), legs, risk/reward grid, and a "How it works" section
 * with the model's beginner-friendly explanation. The disclaimer at the
 * bottom is non-negotiable: premium estimates are heuristics, not live
 * chain quotes.
 */

import type {
  DirectionalView,
  OptionStrategy,
  OptionsOverlay,
  StrategyType,
} from "../types";
import { stripDollar } from "../types";
import DisclaimerLine from "../DisclaimerLine";

const STRATEGY_LABEL: Record<StrategyType, string> = {
  csp: "Cash-secured put (get paid to wait to buy)",
  cc: "Covered call (sell upside for income)",
  long_call: "Long call (leveraged bullish bet)",
  long_put: "Long put (leveraged bearish bet)",
  call_spread: "Bull call spread (defined-risk bullish)",
  put_spread: "Bear put spread (defined-risk bearish)",
  bull_put_spread: "Bull put spread (income, mildly bullish)",
  bear_call_spread: "Bear call spread (income, mildly bearish)",
  collar: "Collar (protect a position, cap upside)",
  diagonal: "Diagonal (long-dated long, short near-term)",
  iron_condor: "Iron condor (profit if price stays flat)",
  calendar_spread: "Calendar spread (profit from time decay)",
  long_straddle: "Long straddle (profit on a big move either way)",
};

const VIEW_META: Record<
  DirectionalView,
  { label: string; bg: string; text: string; border: string }
> = {
  bullish: {
    label: "Bullish",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  bearish: {
    label: "Bearish",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  neutral: {
    label: "Neutral",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  high_vol_event: {
    label: "Big move bet",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
};

const PURPOSE_LABEL: Record<OptionStrategy["purpose"], string> = {
  entry_overlay: "Used to get into the stock",
  position_overlay: "Used to manage shares you already own",
  directional_overlay: "Pure directional bet (no shares involved)",
  income_overlay: "Used to collect option premium as income",
};

export default function OptionsOverlayTab({ data }: { data: OptionsOverlay }) {
  if (data.applicable === false) {
    return <NotApplicable data={data} />;
  }

  return (
    <div className="space-y-4">
      <ContextRow data={data} />

      <div className="space-y-3">
        {(data.strategies || []).map((s, i) => (
          <StrategyCard key={i} strategy={s} />
        ))}
      </div>

      <DisclaimerLine>{data.disclaimer}</DisclaimerLine>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function NotApplicable({ data }: { data: OptionsOverlay }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Options aren&apos;t a good fit here
        </div>
        <p className="text-[13px] text-slate-700">
          {data.skip_reason || "The options market for this stock isn't suitable for an overlay."}
        </p>
      </div>
      {data.iv_context && (
        <p className="text-[12.5px] text-slate-500">{data.iv_context}</p>
      )}
    </div>
  );
}

function ContextRow({ data }: { data: OptionsOverlay }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <ContextCard
        label="Premium pricing"
        body={data.iv_context || "—"}
        hint="Whether option prices on this stock are usually expensive (favors selling) or cheap (favors buying)."
      />
      <ContextCard
        label="How easy to trade"
        body={data.liquidity_warning ? "Use limit orders only" : "Easy"}
        valueClass={
          data.liquidity_warning ? "text-amber-700" : "text-slate-700"
        }
        sub={data.liquidity_note}
      />
      <ContextCard
        label="How this fits with shares"
        body={data.coordination_with_shares || "—"}
      />
    </div>
  );
}

function ContextCard({
  label,
  body,
  hint,
  sub,
  valueClass,
}: {
  label: string;
  body: string;
  hint?: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className={`text-[12.5px] leading-snug ${valueClass ?? "text-slate-700"}`}>
        {body}
      </div>
      {sub && <div className="text-[11.5px] text-slate-500 mt-0.5">{sub}</div>}
      {hint && (
        <div className="text-[11px] text-slate-500 mt-1 leading-snug italic">
          {hint}
        </div>
      )}
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: OptionStrategy }) {
  const view = VIEW_META[strategy.directional_view] ?? VIEW_META.neutral;
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <CardHeader strategy={strategy} view={view} />
      <div className="p-4 space-y-3">
        {strategy.how_it_works && <HowItWorks text={strategy.how_it_works} />}
        {strategy.legs?.length > 0 && <LegsRow legs={strategy.legs} />}
        <RiskRewardRow strategy={strategy} />
        <BestForGrid strategy={strategy} />
        {strategy.assignment_outcome && (
          <p className="text-[11.5px] text-slate-500 italic leading-snug">
            If exercised: {strategy.assignment_outcome}
          </p>
        )}
      </div>
    </div>
  );
}

function CardHeader({
  strategy,
  view,
}: {
  strategy: OptionStrategy;
  view: (typeof VIEW_META)[DirectionalView];
}) {
  return (
    <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-3 flex-wrap border-b border-slate-200">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-bold text-slate-900">{strategy.name}</h4>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${view.bg} ${view.text} ${view.border}`}
          >
            {view.label}
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            {STRATEGY_LABEL[strategy.strategy_type] ?? strategy.strategy_type}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {PURPOSE_LABEL[strategy.purpose] ?? strategy.purpose} ·{" "}
          <span
            className={
              strategy.net_premium_direction === "credit"
                ? "text-emerald-700"
                : "text-amber-700"
            }
          >
            {strategy.net_premium_direction === "credit"
              ? "You collect cash today"
              : "You pay cash today"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HowItWorks({ text }: { text: string }) {
  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
        How it works (in plain English)
      </div>
      <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}

function LegsRow({ legs }: { legs: OptionStrategy["legs"] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        What you actually do
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {legs.map((leg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-[12.5px] bg-slate-50 rounded px-3 py-1.5"
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                leg.action === "buy"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {leg.action}
            </span>
            <span className="font-semibold text-slate-700 capitalize">
              {leg.right}
            </span>
            <span className="font-mono font-bold text-slate-900">
              ${stripDollar(leg.strike)}
            </span>
            <span className="text-slate-500 ml-auto">
              {leg.expiration_target}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskRewardRow({ strategy }: { strategy: OptionStrategy }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <KV
        label="Cost / income"
        value={`~${strategy.est_premium_pct_of_strike}% of strike`}
      />
      <KV
        label="Worst-case loss"
        value={`$${stripDollar(strategy.max_risk_per_contract)}`}
        tone="red"
      />
      <KV
        label="Best-case gain"
        value={
          strategy.max_gain_per_contract === "uncapped"
            ? "Unlimited"
            : `$${stripDollar(strategy.max_gain_per_contract)}`
        }
        tone="emerald"
      />
      <KV
        label="Break-even price"
        value={`$${stripDollar(strategy.breakeven)}`}
      />
    </div>
  );
}

function BestForGrid({ strategy }: { strategy: OptionStrategy }) {
  if (!strategy.best_for && !strategy.not_for) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12.5px]">
      {strategy.best_for && (
        <div className="bg-emerald-50/50 rounded px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Best when
          </span>
          <div className="text-slate-700 mt-0.5 leading-snug">
            {strategy.best_for}
          </div>
        </div>
      )}
      {strategy.not_for && (
        <div className="bg-red-50/40 rounded px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
            Wrong tool when
          </span>
          <div className="text-slate-700 mt-0.5 leading-snug">
            {strategy.not_for}
          </div>
        </div>
      )}
    </div>
  );
}

function KV({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-600"
      : "text-slate-900";
  return (
    <div className="bg-slate-50 rounded px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-[13px] font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
