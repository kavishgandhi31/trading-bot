"use client";

/**
 * The single hero card at the top of every report. Replaces the previous
 * separate header / VerdictBanner / ScoreCard / TradeSetup blocks.
 *
 * Layout (desktop, ≥lg):
 *   ┌─────────────────────────────────┬───────────────────┐
 *   │  Verdict pill + ticker + price  │   Report card     │
 *   │  Plain-English rationale        │   (letter grades) │
 *   │  Right Now strip                │                   │
 *   └─────────────────────────────────┴───────────────────┘
 *
 * On mobile the columns stack — grade card sits below the rationale.
 *
 * The Right Now strip lives BOTH here and in the sticky context bar; we
 * want it always visible, both before and after the user scrolls past the
 * hero.
 */

import { verdictMeta } from "@/app/design/verdict";
import RightNowStrip from "@/app/components/sections/howtobuy/RightNowStrip";
import type { HowToBuy } from "@/app/components/sections/howtobuy/types";
import ScoreCard from "./ScoreCard";

interface Props {
  ticker: string;
  date: string;
  verdict: Record<string, unknown>;
  scores: {
    foundation: number;
    valuation: number;
    risk: number;
    technicals: number;
  };
  plan: HowToBuy | undefined;
  currentPrice: number | null;
}

export default function HeroSection({
  ticker,
  date,
  verdict,
  scores,
  plan,
  currentPrice,
}: Props) {
  const v = verdictMeta(verdict.net_verdict as string | undefined);
  const conviction = verdict.conviction_score ?? "—";
  const rationale =
    (verdict.verdict_rationale as string) ||
    (verdict.verdict_summary as string) ||
    "";

  return (
    <section className="relative px-8 pt-7 pb-7">
      {/* The accent stripe on the left edge of the whole hero. One color =
          one signal: this is the verdict, at a glance. */}
      <div
        aria-hidden
        className={`absolute left-0 top-7 bottom-7 w-1 rounded-full ${v.accent}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="min-w-0">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-slate-400">
            <span>Research report</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="font-mono tracking-normal">{date}</span>
          </div>

          {/* Ticker + verdict pill */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-[40px] leading-none font-extrabold tracking-tight text-slate-900 font-mono">
              {ticker}
            </h1>
            <span
              className={`inline-flex items-center gap-2 ${v.bg} ${v.border} border ${v.text} text-sm font-bold rounded-full px-3 py-1`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
              {v.label}
            </span>
            <span className="text-[13px] text-slate-500 font-medium">
              Conviction{" "}
              <strong className="text-slate-900 font-mono">{String(conviction)}</strong>
              <span className="text-slate-400">/10</span>
            </span>
            {currentPrice !== null && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[13px] text-slate-500 font-medium">
                  Currently{" "}
                  <strong className="text-slate-900 font-mono">
                    ${currentPrice.toFixed(2)}
                  </strong>
                </span>
              </>
            )}
          </div>

          {/* One-sentence rationale */}
          {rationale && (
            <p className="mt-4 text-[15px] leading-7 text-slate-700 max-w-[64ch]">
              {rationale}
            </p>
          )}

          {/* Right Now strip — the answer to "what should I do?" */}
          {plan && !plan.error && (
            <div className="mt-5">
              <RightNowStrip plan={plan} currentPrice={currentPrice} />
            </div>
          )}
        </div>

        {/* Report card on the right (or stacked on mobile) */}
        <div className="lg:sticky lg:top-20">
          <ScoreCard scores={scores} />
        </div>
      </div>
    </section>
  );
}
