/**
 * Single 100% bar split into three segments: invested | held in cash | not used.
 * One glance tells the user how aggressive the plan is and how much cash is
 * being held in reserve.
 *
 * Inputs are percentages of the user's "thesis-budget" — the dollar amount they
 * decided to set aside for this stock specifically.
 */

interface Props {
  /** % of the budget that the plan ultimately invests in the stock. */
  deployedPct: number;
  /** % of the budget held back as cash for adds, deeper dips, etc. */
  dryPowderPct: number;
}

export default function AllocationBar({ deployedPct, dryPowderPct }: Props) {
  const deployed = clampPct(deployedPct);
  const dryPowder = clampPct(dryPowderPct, 100 - deployed);
  const notUsed = Math.max(0, 100 - deployed - dryPowder);

  return (
    <div>
      {/* The bar itself */}
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-200">
        {deployed > 0 && (
          <div
            className="bg-emerald-500"
            style={{ width: `${deployed}%` }}
            title={`Invested in this stock: ${deployed}%`}
          />
        )}
        {dryPowder > 0 && (
          <div
            className="bg-blue-400"
            style={{ width: `${dryPowder}%` }}
            title={`Cash kept on the side for later: ${dryPowder}%`}
          />
        )}
        {notUsed > 0 && (
          <div
            className="bg-slate-300"
            style={{ width: `${notUsed}%` }}
            title={`Not earmarked for this stock at all: ${notUsed}%`}
          />
        )}
      </div>

      {/* Legend with plain-language labels */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-slate-600">
        <Item color="bg-emerald-500" pct={deployed} label="invested in stock" emphasize />
        <Item color="bg-blue-400" pct={dryPowder} label="cash held for later" emphasize />
        {notUsed > 0 && (
          <Item color="bg-slate-300" pct={notUsed} label="not allocated" />
        )}
      </div>
    </div>
  );
}

function Item({
  color,
  pct,
  label,
  emphasize,
}: {
  color: string;
  pct: number;
  label: string;
  emphasize?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-sm ${color}`} />
      <span>
        <span
          className={emphasize ? "font-semibold text-slate-900" : "font-semibold text-slate-700"}
        >
          {pct}%
        </span>{" "}
        {label}
      </span>
    </span>
  );
}

function clampPct(value: number, max = 100): number {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(max, n));
}
