/**
 * Numeric score design tokens (0–10).
 *
 * One source of truth so any surface that renders a score (hero card, ladder,
 * dashboard pill) uses the same threshold colors. The model emits raw 0–10
 * numbers; this module just decorates them.
 *
 * Thresholds chosen to match how investors usually intuit:
 *   ≥8  excellent   emerald
 *   ≥6  good        blue
 *   ≥4  okay        amber
 *   <4  weak        red
 */

export interface ScoreMeta {
  /** "Excellent" | "Good" | "Okay" | "Weak". Used for tooltips + a11y. */
  meaning: string;
  /** Color of the bar fill / text accent. */
  fill: string;
  /** Tailwind text color for the numeric value. */
  text: string;
  /** Tailwind background for the score chip / dot. */
  dot: string;
}

export function scoreMeta(value: number | string | null | undefined): ScoreMeta {
  const n = Number(value);
  if (!Number.isFinite(n)) return UNKNOWN;
  if (n >= 8) {
    return {
      meaning: "Excellent",
      fill: "bg-emerald-500",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  if (n >= 6) {
    return {
      meaning: "Good",
      fill: "bg-blue-500",
      text: "text-blue-700",
      dot: "bg-blue-500",
    };
  }
  if (n >= 4) {
    return {
      meaning: "Okay",
      fill: "bg-amber-500",
      text: "text-amber-700",
      dot: "bg-amber-500",
    };
  }
  return {
    meaning: "Weak",
    fill: "bg-red-500",
    text: "text-red-600",
    dot: "bg-red-500",
  };
}

const UNKNOWN: ScoreMeta = {
  meaning: "Not rated",
  fill: "bg-slate-300",
  text: "text-slate-400",
  dot: "bg-slate-300",
};
