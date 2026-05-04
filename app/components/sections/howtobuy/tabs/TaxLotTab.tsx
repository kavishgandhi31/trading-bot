/**
 * "Cost basis" tab — guidance on how to track and sell individual buys for
 * tax purposes. Generic advice only; the disclaimer reminds the user to talk
 * to their broker / tax advisor before acting.
 */

import type { HowToBuy } from "../types";
import DisclaimerLine from "../DisclaimerLine";

const METHOD_LABEL: Record<string, string> = {
  FIFO: "Sell oldest buys first (FIFO)",
  LIFO: "Sell newest buys first (LIFO)",
  HIFO: "Sell highest-cost buys first (HIFO)",
  specific_id: "Pick which buys to sell by hand",
};

export default function TaxLotTab({ plan }: { plan: HowToBuy }) {
  const t = plan.tax_lot_strategy;
  if (!t) {
    return (
      <div className="text-sm text-slate-500 italic">
        Cost-basis guidance wasn&apos;t generated for this report.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card
          label="Track each buy separately?"
          headline={t.ladder_lots_separately ? "Yes — ask your broker" : "Not needed"}
          body={
            t.ladder_lots_separately
              ? "Turn on per-lot identification with your broker so each buy step is trackable for tax purposes."
              : "The default cost-basis treatment is fine for this plan."
          }
        />
        <Card
          label="Suggested sell-order method"
          headline={METHOD_LABEL[t.preferred_lot_method] || t.preferred_lot_method || "—"}
        />
      </div>

      {t.trim_priority && (
        <Block label="Which buys to sell first when taking profit">
          {t.trim_priority}
        </Block>
      )}

      {t.notes && (
        <p className="text-[12.5px] text-slate-600 leading-relaxed">{t.notes}</p>
      )}

      <DisclaimerLine>{t.disclaimer}</DisclaimerLine>
    </div>
  );
}

function Card({
  label,
  headline,
  body,
}: {
  label: string;
  headline: string;
  body?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-700">{headline}</div>
      {body && (
        <div className="text-[11.5px] text-slate-500 mt-1 leading-snug">
          {body}
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </div>
      <p className="text-[13px] text-slate-700 leading-relaxed bg-slate-50 rounded-lg px-4 py-3">
        {children}
      </p>
    </div>
  );
}
