/**
 * Shared business logic for the "How to buy this" section.
 *
 * Anything that *interprets* the report data (mapping a tranche to a state,
 * deciding what the user should do right now, computing summaries) lives
 * here so all components see the same story. Rendering stays in components;
 * data shapes live in `./types.ts`.
 *
 * IMPORTANT — keep in sync with `backend/utils/email.py`:
 *   - `_right_now_email` mirrors `computeRightNowAction`
 *   - `_tranche_state_email` mirrors `trancheState`
 * The email is rendered server-side in Python, so the two implementations
 * cannot share code. If you change one, change the other in the same commit.
 */

import type { HowToBuy, Tranche, TriggerType } from "./types";
import { parsePrice } from "./types";

// ── Tranche state ───────────────────────────────────────────────────────────

export type TrancheState =
  | "filled" // the buy has fired given the current price + trigger type
  | "waiting" // the trigger is price-based and price hasn't reached it yet
  | "waiting_event"; // trigger requires a specific event (catalyst / calendar)

/**
 * Whether a tranche should be considered "filled" given the current price.
 *
 *  - limit         → buy-the-dip; fires when price drops to or below the level.
 *  - breakout      → buy on confirmation; fires when price closes at or above.
 *  - post_catalyst → never fires from price alone; waits for the named event.
 *  - time_based    → never fires from price alone; waits for the calendar.
 *
 * If `currentPrice` is unknown we treat price-based tranches as still waiting.
 */
export function trancheState(
  trigger: TriggerType,
  currentPrice: number | null,
  trancheLevel: number
): TrancheState {
  if (trigger === "post_catalyst" || trigger === "time_based") {
    return "waiting_event";
  }
  if (currentPrice === null) return "waiting";
  if (trigger === "breakout") {
    return currentPrice >= trancheLevel ? "filled" : "waiting";
  }
  // `limit` (default)
  return currentPrice <= trancheLevel ? "filled" : "waiting";
}

// ── Right-Now strip ─────────────────────────────────────────────────────────

export type RightNowTone = "emerald" | "amber" | "red" | "slate";

export interface RightNowAction {
  tone: RightNowTone;
  headline: string;
  detail: string;
}

/** Take the first sentence so the strip stays terse, even if the LLM wrote a paragraph. */
export function firstSentence(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const trimmed = text.trim();
  // Stop at . ! ? followed by whitespace or end-of-string. Em-dashes do not
  // count, since the LLM frequently uses them mid-sentence.
  const m = trimmed.match(/^[^.!?]+[.!?](?=\s|$)/);
  return (m?.[0] ?? trimmed).trim();
}

interface PricedTranche extends Tranche {
  level: number;
  state: TrancheState;
}

/**
 * Decide the single most useful sentence to show the user at the top of the
 * section: what they should actually DO right now given the current price and
 * the buy plan.
 *
 * Result shape is rendering-agnostic — `RightNowStrip.tsx` (web) and
 * `_right_now_email` (email) both consume something like this.
 */
export function computeRightNowAction(
  plan: HowToBuy,
  currentPrice: number | null
): RightNowAction {
  // ── Posture-based short-circuits ─────────────────────────────────────
  if (plan.posture === "avoid") {
    return {
      tone: "red",
      headline: "Don't buy this.",
      detail: firstSentence(
        plan.do_not_deploy_reason,
        "The verdict and risk profile don't support buying right now."
      ),
    };
  }
  if (plan.posture === "watch_only") {
    return {
      tone: "amber",
      headline: "Wait — no buy today.",
      detail: firstSentence(
        plan.do_not_deploy_reason,
        "Just watch for now. Wait for the conditions in the plan before buying anything."
      ),
    };
  }

  // ── Resolve & sort tranches by price (highest first) ────────────────
  const priced: PricedTranche[] = (plan.tranches ?? [])
    .map((t): PricedTranche | null => {
      const level = parsePrice(t.price);
      if (level === null) return null;
      return {
        ...t,
        level,
        state: trancheState(t.trigger_type, currentPrice, level),
      };
    })
    .filter((t): t is PricedTranche => t !== null)
    .sort((a, b) => b.level - a.level);

  if (priced.length === 0) {
    return {
      tone: "slate",
      headline: "No buy steps defined.",
      detail: plan.deployment_summary || "See the buy plan below for details.",
    };
  }

  // ── Stop-loss invalidation overrides everything else ────────────────
  const stop = parsePrice(plan.invalidation_price);
  if (currentPrice !== null && stop !== null && currentPrice < stop) {
    return {
      tone: "red",
      headline: `Plan cancelled — price dropped below the exit point ($${stop.toFixed(2)}).`,
      detail:
        "Don't buy. Run a fresh report before reconsidering this stock.",
    };
  }

  if (currentPrice === null) {
    const first = priced[0];
    return {
      tone: "slate",
      headline: "Current price unavailable.",
      detail: `First buy is ${first.pct_of_total}% of your budget when price reaches $${first.level.toFixed(2)}.`,
    };
  }

  // ── Find what's next given current price ────────────────────────────
  const filled = priced.filter((p) => p.state === "filled");
  const filledPct = filled.reduce(
    (sum, p) => sum + (Number(p.pct_of_total) || 0),
    0
  );

  // The "next" buy is the highest-priced waiting tranche the user could
  // realistically act on — we order tranches highest→lowest, so for limit
  // buys (drop into level) the next one is the first waiting tranche we hit
  // walking down the list. For breakout/event tranches we still surface them
  // as "the next thing to know about" since they're the user's only pending
  // moves.
  const next = priced.find((p) => p.state !== "filled");

  if (!next) {
    return {
      tone: "emerald",
      headline: `All buys filled (${filledPct}% of your budget invested).`,
      detail: `Hold the position. Next decision is the take-profit plan or the exit at $${stop?.toFixed(2) ?? "—"}.`,
    };
  }

  // First-time buyer — nothing has filled yet.
  if (filled.length === 0) {
    if (next.state === "waiting_event") {
      const triggerLabel = TRIGGER_LABEL_PLAIN[next.trigger_type];
      return {
        tone: "slate",
        headline: `No buy yet — first move waits ${triggerLabel}.`,
        detail: `Plan to put ${next.pct_of_total}% in around $${next.level.toFixed(2)} once it triggers. ${next.condition}.`,
      };
    }
    // Price-based first buy.
    if (next.state === "waiting") {
      const direction =
        next.trigger_type === "breakout" ? "rises to" : "drops to";
      return {
        tone: "slate",
        headline: `Wait — current $${currentPrice.toFixed(2)} hasn't hit the first buy yet.`,
        detail: `First buy: ${next.pct_of_total}% when price ${direction} $${next.level.toFixed(2)} (${next.condition}).`,
      };
    }
  }

  // Some buys have filled, more pending. Prefer the next price-based step
  // (limit/breakout) for the "next" hint — that's what will fire mechanically
  // as price moves. Surface event tranches only if every other waiting tranche
  // is event-based.
  const nextPriceBased = priced.find(
    (p) =>
      p.state === "waiting" &&
      p.trigger_type !== "post_catalyst" &&
      p.trigger_type !== "time_based"
  );
  const chosen = nextPriceBased ?? next;

  if (chosen.state === "waiting_event") {
    return {
      tone: "emerald",
      headline: `${filled.length} buy${filled.length === 1 ? "" : "s"} filled (${filledPct}% invested).`,
      detail: `Next buy waits for an event: ${chosen.pct_of_total}% at $${chosen.level.toFixed(2)}. ${chosen.condition}.`,
    };
  }

  const direction = chosen.trigger_type === "breakout" ? "rises to" : "drops to";
  return {
    tone: "emerald",
    headline: `${filled.length} buy${filled.length === 1 ? "" : "s"} filled (${filledPct}% invested).`,
    detail: `Next buy: ${chosen.pct_of_total}% when price ${direction} $${chosen.level.toFixed(2)} — ${chosen.condition}.`,
  };
}

// ── Plain-language vocabulary ───────────────────────────────────────────────
//
// User-facing labels for trigger types. Used in messages where we explain what
// a pending tranche is waiting for, in beginner terms.

export const TRIGGER_LABEL_PLAIN: Record<TriggerType, string> = {
  limit: "for price to drop to a level",
  breakout: "for price to confirm above a level",
  post_catalyst: "for a specific event (earnings, product launch, etc.)",
  time_based: "for a calendar date",
};
