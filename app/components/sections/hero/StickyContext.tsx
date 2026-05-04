"use client";

/**
 * Sticky context strip — fades in as the user scrolls past the hero so they
 * never lose the "what should I do?" answer while reading the rest of the
 * report.
 *
 * Behavior:
 *   • Hidden until the user has scrolled ~280px (past the hero verdict).
 *   • On desktop: shows ticker + posture pill + Right Now headline (truncated).
 *   • On mobile: shows ticker + posture pill only — no headline (it would wrap
 *     and double the bar height on narrow screens).
 *
 * This component is purely presentational — the headline string comes from
 * `computeRightNowAction` in `howtobuy/logic.ts`, the same source the strip
 * inside the hero uses.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { verdictMeta } from "@/app/design/verdict";
import { computeRightNowAction } from "@/app/components/sections/howtobuy/logic";
import type { HowToBuy } from "@/app/components/sections/howtobuy/types";

interface Props {
  ticker: string;
  verdict: Record<string, unknown>;
  plan: HowToBuy | undefined;
  currentPrice: number | null;
}

const REVEAL_AFTER_PX = 280;

export default function StickyContext({
  ticker,
  verdict,
  plan,
  currentPrice,
}: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > REVEAL_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const v = verdictMeta(verdict.net_verdict as string | undefined);
  const action =
    plan && !plan.error
      ? computeRightNowAction(plan, currentPrice)
      : null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-200 ${
        shown
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
      aria-hidden={!shown}
    >
      <div className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-[1100px] mx-auto px-6 py-2.5 flex items-center gap-3">
          <Link
            href="/"
            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Back to dashboard"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className={`shrink-0 w-1 h-5 rounded-full ${v.accent}`} />

          <span className="font-mono font-bold text-slate-900 text-sm tracking-tight">
            {ticker}
          </span>

          <span
            className={`shrink-0 inline-flex items-center gap-1.5 ${v.bg} ${v.border} border ${v.text} text-[11px] font-bold rounded-full px-2 py-0.5`}
          >
            <span className={`w-1 h-1 rounded-full ${v.dot}`} />
            {v.short}
          </span>

          {/* Right Now sentence — desktop only */}
          {action && (
            <div className="hidden md:flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400 shrink-0">
                Right now
              </span>
              <span className="text-[12.5px] text-slate-700 font-medium truncate">
                {action.headline}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
