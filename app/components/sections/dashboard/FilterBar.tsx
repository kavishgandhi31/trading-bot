"use client";

/**
 * Filter + sort controls for the dashboard report list.
 *
 * Filter is a single multi-state pill row keyed by posture. Sort is a small
 * native `<select>` next to it — three options: most recent, highest
 * conviction, "actionable today" (filled buys → waiting → events → avoid).
 *
 * Counts come from the parent so we can render zero-state pills correctly
 * ("no buy reports") without re-walking the dataset on every keystroke.
 */

import { POSTURE_ORDER, postureMeta } from "./postures";
import type { Posture } from "@/app/components/sections/howtobuy/types";

export type SortKey = "actionable" | "recent" | "conviction";

interface Props {
  total: number;
  countsByPosture: Partial<Record<Posture, number>>;
  selectedPosture: Posture | "all";
  onPostureChange: (p: Posture | "all") => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}

export default function FilterBar({
  total,
  countsByPosture,
  selectedPosture,
  onPostureChange,
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <PostureChip
          label="All"
          count={total}
          selected={selectedPosture === "all"}
          onClick={() => onPostureChange("all")}
        />
        {POSTURE_ORDER.map((p) => {
          const meta = postureMeta(p);
          const count = countsByPosture[p] ?? 0;
          return (
            <PostureChip
              key={p}
              label={meta.label}
              dot={meta.accent}
              count={count}
              selected={selectedPosture === p}
              disabled={count === 0}
              onClick={() => onPostureChange(p)}
            />
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-[12px] text-slate-500">
        Sort
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
        >
          <option value="actionable">Actionable today</option>
          <option value="recent">Most recent</option>
          <option value="conviction">Highest conviction</option>
        </select>
      </label>
    </div>
  );
}

function PostureChip({
  label,
  count,
  dot,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full pl-2.5 pr-2 py-1 border transition-colors ${
        selected
          ? "bg-slate-900 text-white border-slate-900"
          : disabled
          ? "bg-white text-slate-300 border-slate-200 cursor-not-allowed"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900"
      }`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            selected ? "bg-white/70" : dot
          }`}
        />
      )}
      <span>{label}</span>
      <span
        className={`text-[10.5px] font-mono font-bold rounded-full px-1.5 ${
          selected
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
