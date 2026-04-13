"use client";

const VERDICT_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; badge: string; border: string }
> = {
  strong_buy: {
    label: "STRONG BUY",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    badge: "bg-emerald-600",
    border: "border-emerald-200",
  },
  buy: {
    label: "BUY",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    badge: "bg-emerald-500",
    border: "border-emerald-200",
  },
  hold: {
    label: "HOLD",
    bg: "bg-amber-50",
    text: "text-amber-800",
    badge: "bg-amber-500",
    border: "border-amber-200",
  },
  sell: {
    label: "SELL",
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-500",
    border: "border-red-200",
  },
  strong_sell: {
    label: "STRONG SELL",
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-600",
    border: "border-red-200",
  },
};

const DEFAULT_CONFIG = {
  label: "NEUTRAL",
  bg: "bg-slate-50",
  text: "text-slate-700",
  badge: "bg-slate-500",
  border: "border-slate-200",
};

export default function VerdictBanner({
  verdict,
}: {
  verdict: Record<string, unknown>;
}) {
  const key = (verdict.net_verdict as string) || "hold";
  const config = VERDICT_CONFIG[key] || DEFAULT_CONFIG;
  const conviction = verdict.conviction_score ?? "—";
  const rationale =
    (verdict.verdict_rationale as string) ||
    (verdict.verdict_summary as string) ||
    "";

  return (
    <div className={`${config.bg} border-b-2 ${config.border} px-8 py-6`}>
      <div className="flex items-center gap-4 mb-4">
        <span
          className={`${config.badge} text-white text-sm font-extrabold tracking-wide px-5 py-2 rounded`}
        >
          {config.label}
        </span>
        <span className="text-slate-500 text-sm font-medium">
          Conviction{" "}
          <strong className="text-slate-900 text-xl">
            {String(conviction)}
          </strong>
          <span className="text-slate-400">/10</span>
        </span>
      </div>
      <p className="text-slate-700 text-base leading-7">{rationale}</p>
    </div>
  );
}
