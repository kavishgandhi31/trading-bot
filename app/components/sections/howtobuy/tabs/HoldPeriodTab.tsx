/**
 * "How long" tab — how long the thesis is meant to live and when to look at
 * the position again. Three numbers that fit on one screen, one optional note.
 */

import type { HowToBuy } from "../types";

const CADENCE_LABEL: Record<string, string> = {
  weekly: "Check in weekly",
  monthly: "Check in monthly",
  quarterly: "Check in every quarter",
  "on-event-only": "Only check on a specific event",
};

export default function HoldPeriodTab({ plan }: { plan: HowToBuy }) {
  const h = plan.hold_period;
  if (!h) {
    return (
      <div className="text-sm text-slate-500 italic">
        Hold-period guidance wasn&apos;t generated for this report.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          label="How long to hold"
          big={String(h.expected_hold_days || "—")}
          unit="days"
        />
        <Card label="Time window" body={h.catalyst_window || "—"} />
        <Card
          label="How often to re-check"
          body={CADENCE_LABEL[h.re_eval_cadence] || h.re_eval_cadence || "—"}
        />
      </div>
      {h.notes && (
        <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3">
          {h.notes}
        </p>
      )}
    </div>
  );
}

function Card({
  label,
  big,
  unit,
  body,
}: {
  label: string;
  big?: string;
  unit?: string;
  body?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      {big ? (
        <div className="text-2xl font-extrabold text-slate-900">
          {big}
          {unit && (
            <span className="text-sm font-semibold text-slate-500 ml-1">
              {unit}
            </span>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-700 leading-snug font-medium">
          {body}
        </div>
      )}
    </div>
  );
}
