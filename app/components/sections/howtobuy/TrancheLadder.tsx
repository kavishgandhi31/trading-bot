"use client";

/**
 * Vertical buy ladder. Each tranche gets its own row so cramped price clusters
 * (e.g. several limits inside a $20 entry zone) read cleanly. Stop and target
 * are end-caps; the "Now" marker slots in between rows at the right vertical
 * position so the user can see at a glance how many buys sit above and below
 * the current price.
 *
 * Pure rendering. State semantics ("filled", "waiting", "waiting on event")
 * come from `./logic.ts` so they cannot drift between this component and the
 * Right Now strip.
 */

import type { Tranche, TriggerType } from "./types";
import type { TrancheState } from "./logic";
import { parsePrice } from "./types";
import { trancheState } from "./logic";

// ── Plain-language labels for trigger types ─────────────────────────────────
//
// The model emits machine names (`limit`, `post_catalyst`, …); the user sees
// terms a beginner can parse.

const TRIGGER_PILL: Record<
  TriggerType,
  { label: string; pillBg: string; pillText: string; dotFill: string; dotRing: string }
> = {
  limit: {
    label: "Buy on dip",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    dotFill: "bg-emerald-500",
    dotRing: "ring-emerald-100",
  },
  breakout: {
    label: "Buy on breakout",
    pillBg: "bg-blue-50",
    pillText: "text-blue-700",
    dotFill: "bg-blue-500",
    dotRing: "ring-blue-100",
  },
  post_catalyst: {
    label: "After event",
    pillBg: "bg-amber-50",
    pillText: "text-amber-700",
    dotFill: "bg-amber-500",
    dotRing: "ring-amber-100",
  },
  time_based: {
    label: "On schedule",
    pillBg: "bg-violet-50",
    pillText: "text-violet-700",
    dotFill: "bg-violet-500",
    dotRing: "ring-violet-100",
  },
};

const STATE_LABEL: Record<TrancheState, string> = {
  filled: "Bought",
  waiting: "Waiting",
  waiting_event: "Waiting for event",
};

// ── Public component ────────────────────────────────────────────────────────

interface Props {
  tranches: Tranche[];
  currentPrice: number | null;
  invalidationPrice: number | null;
  bullTarget: number | null;
}

export default function TrancheLadder({
  tranches,
  currentPrice,
  invalidationPrice,
  bullTarget,
}: Props) {
  const sorted = tranches
    .map((t) => ({ ...t, level: parsePrice(t.price) }))
    .filter((t): t is typeof t & { level: number } => t.level !== null)
    .sort((a, b) => b.level - a.level); // highest price first

  if (sorted.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic">
        No buy steps in this plan.
      </div>
    );
  }

  const maxPct = Math.max(
    ...sorted.map((t) => Number(t.pct_of_total) || 0),
    1
  );

  // Where to insert the "Now" marker. -1 means above all tranches; sorted.length
  // means below all tranches; otherwise it sits between rows.
  let nowSlotIdx = -1;
  if (currentPrice !== null) {
    const idx = sorted.findIndex((t) => t.level < currentPrice);
    nowSlotIdx = idx === -1 ? sorted.length : idx;
  }

  // Decide whether the "Now" marker sits *outside* the table (above the
  // target cap or below the stop cap) versus inside the table as a divider.
  const showTopNowOutside =
    currentPrice !== null &&
    bullTarget !== null &&
    currentPrice <= bullTarget &&
    nowSlotIdx === 0;
  const showBottomNowOutside =
    currentPrice !== null &&
    invalidationPrice !== null &&
    currentPrice >= invalidationPrice &&
    nowSlotIdx === sorted.length;

  return (
    <div className="space-y-1.5">
      {bullTarget !== null && (
        <CapRow label="Take profit" price={bullTarget} tone="emerald" />
      )}

      {showTopNowOutside && currentPrice !== null && (
        <NowOutsideRow price={currentPrice} />
      )}

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {sorted.map((t, i) => (
          <div key={i}>
            {i === nowSlotIdx && i !== 0 && currentPrice !== null && (
              <NowDividerRow price={currentPrice} />
            )}
            <TrancheRow
              tranche={t}
              maxPct={maxPct}
              currentPrice={currentPrice}
            />
          </div>
        ))}
        {nowSlotIdx === sorted.length &&
          !showBottomNowOutside &&
          currentPrice !== null && <NowDividerRow price={currentPrice} />}
      </div>

      {showBottomNowOutside && currentPrice !== null && (
        <NowOutsideRow price={currentPrice} />
      )}

      {invalidationPrice !== null && (
        <CapRow label="Exit if hit" price={invalidationPrice} tone="red" />
      )}

      <Legend tranches={sorted} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TrancheRow({
  tranche,
  maxPct,
  currentPrice,
}: {
  tranche: Tranche & { level: number };
  maxPct: number;
  currentPrice: number | null;
}) {
  const trigger = TRIGGER_PILL[tranche.trigger_type] ?? TRIGGER_PILL.limit;
  const state = trancheState(
    tranche.trigger_type,
    currentPrice,
    tranche.level
  );

  // Dot diameter scales with allocation size, so the user can see at a glance
  // which buys are big and which are small.
  const pct = Number(tranche.pct_of_total) || 0;
  const dotPx = 12 + (Math.max(pct, 1) / Math.max(maxPct, 1)) * 10;

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      {/* State dot */}
      <div className="shrink-0 w-7 flex justify-center pt-0.5">
        <StateDot state={state} trigger={tranche.trigger_type} sizePx={dotPx} />
      </div>

      {/* Price + percent */}
      <div className="shrink-0 w-16">
        <div className="font-mono font-bold text-slate-900 text-[14px] leading-none">
          ${tranche.level.toFixed(2)}
        </div>
        <div className="font-mono font-bold text-emerald-700 text-[12.5px] leading-none mt-1">
          {pct}%
        </div>
      </div>

      {/* Condition — wraps freely instead of truncating */}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-slate-700 leading-snug whitespace-normal break-words">
          {tranche.condition}
        </div>
      </div>

      {/* Trigger + state pills */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${trigger.pillBg} ${trigger.pillText}`}
          title={tranche.trigger_type.replace("_", " ")}
        >
          {trigger.label}
        </span>
        <span
          className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${
            state === "filled"
              ? "text-emerald-700"
              : state === "waiting_event"
              ? "text-amber-700"
              : "text-slate-400"
          }`}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );
}

function StateDot({
  state,
  trigger,
  sizePx,
}: {
  state: TrancheState;
  trigger: TriggerType;
  sizePx: number;
}) {
  const meta = TRIGGER_PILL[trigger] ?? TRIGGER_PILL.limit;

  if (state === "filled") {
    return (
      <div
        style={{ width: sizePx, height: sizePx }}
        className={`rounded-full ${meta.dotFill} ring-4 ${meta.dotRing} flex items-center justify-center text-white shadow-sm`}
        title="This buy has fired"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    );
  }

  if (state === "waiting_event") {
    return (
      <div
        style={{ width: sizePx, height: sizePx }}
        className={`rounded-full ${meta.dotFill} ring-4 ${meta.dotRing} flex items-center justify-center text-white shadow-sm`}
        title="Waits for an event before buying"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
    );
  }

  // waiting (price-based, hasn't hit yet)
  return (
    <div
      style={{ width: sizePx, height: sizePx }}
      className="rounded-full bg-white border-2 border-slate-300"
      title="Waiting on price"
    />
  );
}

function NowOutsideRow({ price }: { price: number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-dashed border-slate-300" />
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 bg-white border border-slate-300 px-2 py-0.5 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        Now ${price.toFixed(2)}
      </span>
      <div className="flex-1 border-t border-dashed border-slate-300" />
    </div>
  );
}

function NowDividerRow({ price }: { price: number }) {
  return (
    <div className="bg-slate-50 border-y border-slate-200 px-3 py-1.5 flex items-center gap-2">
      <div className="flex-1 border-t border-dashed border-slate-300" />
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        Now ${price.toFixed(2)}
      </span>
      <div className="flex-1 border-t border-dashed border-slate-300" />
    </div>
  );
}

function CapRow({
  label,
  price,
  tone,
}: {
  label: string;
  price: number;
  tone: "emerald" | "red";
}) {
  const colors =
    tone === "emerald"
      ? { text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" }
      : { text: "text-red-600", border: "border-red-200", dot: "bg-red-500" };
  return (
    <div className="flex items-center gap-2 px-1">
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
        {label}
      </span>
      <span className={`font-mono font-bold text-[12px] ${colors.text}`}>
        ${price.toFixed(2)}
      </span>
      <div className={`flex-1 border-t border-dashed ${colors.border}`} />
    </div>
  );
}

function Legend({ tranches }: { tranches: Array<Tranche & { level: number }> }) {
  const types = Array.from(new Set(tranches.map((t) => t.trigger_type)));
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-slate-500 pt-2">
      {types.map((tt) => {
        const meta = TRIGGER_PILL[tt] ?? TRIGGER_PILL.limit;
        return (
          <span key={tt} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${meta.dotFill}`} />
            {meta.label}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
        Already bought
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full border border-slate-400 bg-white" />
        Not yet
      </span>
    </div>
  );
}
