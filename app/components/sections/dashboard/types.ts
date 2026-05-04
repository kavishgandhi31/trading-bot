/**
 * Shape of a single dashboard card. Computed server-side in `loadReports()`
 * (in app/page.tsx) and consumed by `DashboardCard.tsx`. Keeps the card
 * itself a pure renderer with no JSON-poking logic.
 */

import type { Posture } from "@/app/components/sections/howtobuy/types";
import type { VerdictKey } from "@/app/design/verdict";

export interface DashboardReport {
  slug: string;
  ticker: string;
  date: string;

  verdict: VerdictKey | string;
  conviction: number;
  verdictSummary: string;

  /** Posture is taken from how_to_buy.posture; falls back to a verdict-derived
   *  guess for older reports that don't have a buy plan. */
  posture: Posture;
  totalAllocationPct: number | null;
  /** The single sentence we want the user to read on the card. */
  rightNowHeadline: string;

  scores: {
    foundation: number;
    valuation: number;
    risk: number;
    technicals: number;
  };

  /** Most recent activity timestamp — used for "Refreshed N days ago". */
  refreshedAt: string;
}
