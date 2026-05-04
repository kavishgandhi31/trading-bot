/**
 * Verdict design tokens.
 *
 * The model emits enum keys (`strong_buy`, `hold`, etc.); the UI renders them
 * with consistent label, color, and accent across hero, sticky bar, and any
 * future surface. Centralised here so we never style the same enum twice.
 */

export type VerdictKey =
  | "strong_buy"
  | "buy"
  | "hold"
  | "sell"
  | "strong_sell";

export interface VerdictMeta {
  label: string;
  short: string;
  /** Tailwind text color for the label */
  text: string;
  /** Tailwind background for chips/badges */
  bg: string;
  /** Tailwind border for chips */
  border: string;
  /** Solid color used for the dot in pills */
  dot: string;
  /** Used for the left accent stripe on cards */
  accent: string;
}

export function verdictMeta(key: string | undefined): VerdictMeta {
  return META[key as VerdictKey] ?? META.hold;
}

const META: Record<VerdictKey, VerdictMeta> = {
  strong_buy: {
    label: "Strong buy",
    short: "Strong buy",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
  },
  buy: {
    label: "Buy",
    short: "Buy",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
  },
  hold: {
    label: "Hold",
    short: "Hold",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    accent: "bg-amber-500",
  },
  sell: {
    label: "Sell",
    short: "Sell",
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    accent: "bg-red-500",
  },
  strong_sell: {
    label: "Strong sell",
    short: "Strong sell",
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    accent: "bg-red-500",
  },
};
