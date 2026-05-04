/**
 * The single most useful sentence in the report: what the user should DO right
 * now, given the current price and the buy plan. Computation lives in
 * `./logic.ts` so the email and any future surface stay aligned.
 */
import type { HowToBuy } from "./types";
import type { RightNowTone } from "./logic";
import { computeRightNowAction } from "./logic";

interface Props {
  plan: HowToBuy;
  currentPrice: number | null;
}

const TONE_CLASSES: Record<
  RightNowTone,
  { bg: string; border: string; text: string; accent: string }
> = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    accent: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    accent: "text-amber-600",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-900",
    accent: "text-red-600",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-900",
    accent: "text-slate-500",
  },
};

export default function RightNowStrip({ plan, currentPrice }: Props) {
  const action = computeRightNowAction(plan, currentPrice);
  const tone = TONE_CLASSES[action.tone];
  return (
    <div
      className={`rounded-lg border ${tone.bg} ${tone.border} px-4 py-3 flex items-start gap-3`}
    >
      <div
        className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${tone.accent} mt-0.5 shrink-0`}
      >
        Right now
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-bold leading-snug ${tone.text}`}>
          {action.headline}
        </div>
        <div className="text-[12.5px] text-slate-600 leading-relaxed mt-0.5">
          {action.detail}
        </div>
      </div>
    </div>
  );
}
