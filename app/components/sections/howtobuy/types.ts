// Strict types for the "How to buy this" section. The report JSON arrives as
// `Record<string, unknown>` from disk, so we narrow at the section boundary
// rather than spreading `as` casts throughout the components.

export type Posture =
  | "deploy_full"
  | "deploy_partial"
  | "starter_only"
  | "watch_only"
  | "avoid";

export type TriggerType = "limit" | "breakout" | "post_catalyst" | "time_based";

export type ReEvalCadence =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "on-event-only";

export type LiquidityFlag = "ok" | "thin" | "illiquid";

export interface Tranche {
  price: string;
  pct_of_total: number;
  trigger_type: TriggerType;
  condition: string;
  rationale: string;
}

export interface ScaleOutLevel {
  price: string;
  pct_of_position: number;
  rationale: string;
}

export interface SizingMath {
  estimated_win_probability_pct: number;
  estimated_avg_win_pct: string;
  estimated_avg_loss_pct: string;
  kelly_fraction_pct: string;
  fractional_kelly_recommendation_pct: string;
  agrees_with_posture: boolean;
  disagreement_note?: string;
  disclaimer: string;
}

export interface HoldPeriod {
  expected_hold_days: number;
  catalyst_window: string;
  re_eval_cadence: ReEvalCadence;
  notes: string;
}

export interface TaxLotStrategy {
  ladder_lots_separately: boolean;
  preferred_lot_method: "FIFO" | "LIFO" | "HIFO" | "specific_id";
  trim_priority: string;
  notes: string;
  disclaimer: string;
}

export interface HowToBuy {
  posture: Posture;
  should_deploy: boolean;
  do_not_deploy_reason?: string;
  total_allocation_pct: number;
  dry_powder_pct: number;
  risk_per_trade_pct: number;
  catalyst_timing: string;
  tranches: Tranche[];
  scale_out: ScaleOutLevel[];
  invalidation_price: string;
  reevaluate_triggers: string[];
  liquidity_flag: LiquidityFlag;
  sizing_math: SizingMath;
  hold_period: HoldPeriod;
  tax_lot_strategy: TaxLotStrategy;
  deployment_summary: string;
  // Set by the engine when an upstream stage failed.
  error?: string;
}

export type StrategyType =
  | "csp"
  | "cc"
  | "long_call"
  | "long_put"
  | "call_spread"
  | "put_spread"
  | "bull_put_spread"
  | "bear_call_spread"
  | "collar"
  | "diagonal"
  | "iron_condor"
  | "calendar_spread"
  | "long_straddle";

export type StrategyPurpose =
  | "entry_overlay"
  | "position_overlay"
  | "directional_overlay"
  | "income_overlay";

export type DirectionalView = "bullish" | "bearish" | "neutral" | "high_vol_event";

export interface OptionLeg {
  action: "buy" | "sell";
  right: "call" | "put";
  strike: string;
  expiration_target: string;
}

export interface OptionStrategy {
  name: string;
  strategy_type: StrategyType;
  purpose: StrategyPurpose;
  directional_view: DirectionalView;
  legs: OptionLeg[];
  net_premium_direction: "credit" | "debit";
  est_premium_pct_of_strike: string;
  max_risk_per_contract: string;
  max_gain_per_contract: string;
  breakeven: string;
  assignment_outcome: string;
  best_for: string;
  not_for: string;
  how_it_works: string;
}

export interface OptionsOverlay {
  applicable: boolean;
  skip_reason?: string;
  strategies: OptionStrategy[];
  iv_context: string;
  liquidity_warning: boolean;
  liquidity_note?: string;
  coordination_with_shares: string;
  disclaimer: string;
  error?: string;
}

export interface PortfolioFit {
  using_user_context: boolean;
  concentration_risk: "low" | "moderate" | "high";
  single_position_check: {
    violates_user_cap: boolean;
    notes: string;
  };
  sector_overlap_check: {
    current_sector_exposure_pct: string;
    post_add_sector_exposure_pct: string;
    violates_user_cap: boolean;
    overlapping_holdings: string[];
    notes: string;
  };
  thematic_overlap: {
    themes: string[];
    overlapping_holdings: string[];
    notes: string;
  };
  diversification_fit: "additive" | "redundant" | "hedging";
  recommended_allocation_adjustment_pct: number;
  adjustment_rationale: string;
  out_of_scope_warnings: string[];
  portfolio_fit_summary: string;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function stripDollar(v: unknown): string {
  return String(v ?? "").replace(/^\s*\$\s*/, "");
}

export function parsePrice(v: unknown): number | null {
  const stripped = stripDollar(v).replace(/,/g, "");
  const n = parseFloat(stripped);
  return Number.isFinite(n) ? n : null;
}
