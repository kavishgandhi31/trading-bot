/**
 * Posture design tokens for the dashboard.
 *
 * The buy-plan posture (`deploy_full`, `watch_only`, etc.) drives the card's
 * accent stripe + filter pill colors. Same posture key as
 * `app/components/sections/howtobuy/types.ts`; this just decorates it for
 * surfaces outside the report itself.
 */

import type { Posture } from "@/app/components/sections/howtobuy/types";

export interface PostureMeta {
  label: string;
  tooltip: string;
  /** Color of the left-edge accent stripe on cards. */
  accent: string;
  /** Pill background. */
  bg: string;
  /** Pill text color. */
  text: string;
  /** Pill border color. */
  border: string;
  /** True if this posture means the user might actually buy something. */
  actionable: boolean;
}

export function postureMeta(p: Posture | string | undefined): PostureMeta {
  return META[p as Posture] ?? META.watch_only;
}

const META: Record<Posture, PostureMeta> = {
  deploy_full: {
    label: "Buy full",
    tooltip: "High-conviction full position",
    accent: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    actionable: true,
  },
  deploy_partial: {
    label: "Partial buy",
    tooltip: "Buy a partial position",
    accent: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    actionable: true,
  },
  starter_only: {
    label: "Small starter",
    tooltip: "Small probe position only",
    accent: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    actionable: true,
  },
  watch_only: {
    label: "Just watch",
    tooltip: "No position today; wait for a trigger",
    accent: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    actionable: false,
  },
  avoid: {
    label: "Don't buy",
    tooltip: "Avoid — no long deployment",
    accent: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    actionable: false,
  },
};

/** Order used in the filter pill row. */
export const POSTURE_ORDER: Posture[] = [
  "deploy_full",
  "deploy_partial",
  "starter_only",
  "watch_only",
  "avoid",
];
