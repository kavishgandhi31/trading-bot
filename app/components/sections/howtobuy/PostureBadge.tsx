import type { Posture } from "./types";

/**
 * Posture pill — the colored chip that shows the headline recommendation.
 * Labels are intentionally plain English; the underlying enum from the prompt
 * (`deploy_full`, `starter_only`, etc.) is hidden from the user.
 */

const META: Record<
  Posture,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  deploy_full: {
    label: "Buy full position",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
  },
  deploy_partial: {
    label: "Partial buy",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
  },
  starter_only: {
    label: "Small starter",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  watch_only: {
    label: "Just watch",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  avoid: {
    label: "Don't buy",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

export default function PostureBadge({
  posture,
  size = "md",
}: {
  posture: Posture;
  size?: "sm" | "md";
}) {
  const m = META[posture] ?? META.watch_only;
  const sized =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";
  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md border ${m.bg} ${m.text} ${m.border} ${sized}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
