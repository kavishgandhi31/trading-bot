/**
 * Inline italic amber text for actionable-but-imprecise numbers (Kelly heuristics,
 * options premium estimates, tax guidance). Visible by design — disclaimers belong
 * on the page, not buried in a tooltip.
 */
export default function DisclaimerLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] italic leading-relaxed text-amber-700/90 mt-1.5">
      {children}
    </p>
  );
}
