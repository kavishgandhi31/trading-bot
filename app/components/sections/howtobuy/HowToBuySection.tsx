"use client";

/**
 * "How to buy this" — top-level zone in the report, sitting between the trade
 * setup and the deep-dive sections. Its job is to translate the LLM's plan
 * into something a beginner can act on without learning institutional jargon.
 *
 * Layout (top to bottom):
 *   1. Header row: posture pill + total allocation + max-loss number
 *   2. "Right Now" strip — one-sentence next action
 *   3. Capital-split bar (compact, full width)
 *   4. Vertical buy ladder (compact, full width)
 *   5. Plain-English summary
 *   6. Tab strip with detail tabs (Ladder, Sizing, Hold, Tax, Options, Fit)
 *
 * For posture = avoid / watch_only the body collapses to a "why this isn't
 * deployable" card and only Options and Portfolio Fit tabs remain visible.
 *
 * State: only the active-tab id is local. Everything else flows from props.
 */

import { useState } from "react";
import type { HowToBuy, OptionsOverlay, PortfolioFit } from "./types";
import { parsePrice } from "./types";
import PostureBadge from "./PostureBadge";
import RightNowStrip from "./RightNowStrip";
import AllocationBar from "./AllocationBar";
import TrancheLadder from "./TrancheLadder";
import LadderTab from "./tabs/LadderTab";
import SizingMathTab from "./tabs/SizingMathTab";
import HoldPeriodTab from "./tabs/HoldPeriodTab";
import TaxLotTab from "./tabs/TaxLotTab";
import OptionsOverlayTab from "./tabs/OptionsOverlayTab";
import PortfolioFitTab from "./tabs/PortfolioFitTab";

type TabId = "ladder" | "sizing" | "hold" | "tax" | "options" | "fit";

interface TabSpec {
  id: TabId;
  label: string;
  available: boolean;
}

interface Props {
  plan: HowToBuy | undefined;
  options: OptionsOverlay | undefined;
  portfolioFit: PortfolioFit | undefined;
  /** Latest known stock price, parsed from the report's `meta.current_price`. */
  currentPrice: number | null;
  /** The bull-case price target, used as the upper rail of the ladder. */
  bullTarget: number | null;
}

// ── Tab labels in plain English ────────────────────────────────────────────
//
// Internal id stays cryptic (it's only for routing the active tab); the
// label is what the user actually reads.

const TAB_LABEL: Record<TabId, string> = {
  ladder: "Buy plan",
  sizing: "How much",
  hold: "How long",
  tax: "Cost basis",
  options: "Options",
  fit: "Your portfolio",
};

export default function HowToBuySection({
  plan,
  options,
  portfolioFit,
  currentPrice,
  bullTarget,
}: Props) {
  const [tab, setTab] = useState<TabId>("ladder");

  // ── Defensive: missing or errored plan ────────────────────────────────
  if (!plan || plan.error) {
    return <ErrorState message={plan?.error || "no plan in this report"} />;
  }

  const isPassivePosture =
    plan.posture === "avoid" || plan.posture === "watch_only";
  const invalidation = parsePrice(plan.invalidation_price);

  // Which tabs are even meaningful for this posture? An avoid plan has no
  // ladder/sizing/etc., so we only expose the still-relevant ones.
  const tabs: TabSpec[] = [
    { id: "ladder", label: TAB_LABEL.ladder, available: !isPassivePosture },
    { id: "sizing", label: TAB_LABEL.sizing, available: !isPassivePosture },
    { id: "hold", label: TAB_LABEL.hold, available: !isPassivePosture },
    { id: "tax", label: TAB_LABEL.tax, available: !isPassivePosture },
    {
      id: "options",
      label: TAB_LABEL.options,
      available: !!options && options.applicable !== false && !options.error,
    },
    {
      id: "fit",
      label: TAB_LABEL.fit,
      available: !!portfolioFit && !portfolioFit.error,
    },
  ];

  // If the user's selected tab isn't available for this posture (e.g. they
  // were on "Buy plan" then we navigate to a sell-verdict report), fall back
  // to the first available tab.
  const currentTab =
    tabs.find((t) => t.id === tab && t.available)?.id ??
    tabs.find((t) => t.available)?.id ??
    "ladder";

  return (
    <div className="px-8 py-6 border-b border-slate-200">
      <Header plan={plan} isPassivePosture={isPassivePosture} />

      <div className="mb-5">
        <RightNowStrip plan={plan} currentPrice={currentPrice} />
      </div>

      {isPassivePosture ? (
        <PassiveBody
          plan={plan}
          options={options}
          portfolioFit={portfolioFit}
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={setTab}
        />
      ) : (
        <ActiveBody
          plan={plan}
          options={options}
          portfolioFit={portfolioFit}
          currentPrice={currentPrice}
          invalidation={invalidation}
          bullTarget={bullTarget}
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={setTab}
        />
      )}
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

function Header({
  plan,
  isPassivePosture,
}: {
  plan: HowToBuy;
  isPassivePosture: boolean;
}) {
  const allocPct = Number(plan.total_allocation_pct) || 0;
  const lossPct = Number(plan.risk_per_trade_pct) || 0;

  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400">
          How to buy this
        </div>
        <PostureBadge posture={plan.posture} />
      </div>
      {!isPassivePosture && (
        <div className="text-[11.5px] text-slate-500 flex items-center gap-3">
          <span>
            <span className="font-bold text-slate-900">{allocPct}%</span> of
            money set aside for this stock
          </span>
          {lossPct > 0 && (
            <>
              <span className="w-px h-3 bg-slate-300" />
              <span title="Worst-case loss if every buy fills and the exit price hits">
                <span className="font-bold text-red-600">−{lossPct}%</span> if
                exit hit
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Body for actionable postures (deploy_full / deploy_partial / starter) ──

function ActiveBody({
  plan,
  options,
  portfolioFit,
  currentPrice,
  invalidation,
  bullTarget,
  tabs,
  currentTab,
  onTabChange,
}: {
  plan: HowToBuy;
  options: OptionsOverlay | undefined;
  portfolioFit: PortfolioFit | undefined;
  currentPrice: number | null;
  invalidation: number | null;
  bullTarget: number | null;
  tabs: TabSpec[];
  currentTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  return (
    <>
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Where the money goes
        </div>
        <AllocationBar
          deployedPct={plan.total_allocation_pct}
          dryPowderPct={plan.dry_powder_pct}
        />
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          Buy plan
        </div>
        <TrancheLadder
          tranches={plan.tranches}
          currentPrice={currentPrice}
          invalidationPrice={invalidation}
          bullTarget={bullTarget}
        />
      </div>

      {plan.deployment_summary && (
        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 mb-5">
          {plan.deployment_summary}
        </p>
      )}

      <TabBar
        tabs={tabs.filter((t) => t.available)}
        current={currentTab}
        onChange={onTabChange}
      />
      <div className="mt-4">
        <TabContent
          currentTab={currentTab}
          plan={plan}
          options={options}
          portfolioFit={portfolioFit}
        />
      </div>
    </>
  );
}

// ── Body for passive postures (avoid / watch_only) ─────────────────────────

function PassiveBody({
  plan,
  options,
  portfolioFit,
  tabs,
  currentTab,
  onTabChange,
}: {
  plan: HowToBuy;
  options: OptionsOverlay | undefined;
  portfolioFit: PortfolioFit | undefined;
  tabs: TabSpec[];
  currentTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  const passiveTabs = tabs.filter(
    (t) => t.available && (t.id === "options" || t.id === "fit")
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        Why this isn&apos;t worth buying
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {plan.do_not_deploy_reason ||
          plan.deployment_summary ||
          "No clear edge today."}
      </p>

      {plan.reevaluate_triggers?.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            What would change this
          </div>
          <ul className="text-[12.5px] text-slate-600 leading-relaxed list-disc pl-5 space-y-1">
            {plan.reevaluate_triggers.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {passiveTabs.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <TabBar tabs={passiveTabs} current={currentTab} onChange={onTabChange} />
          <div className="mt-4">
            <TabContent
              currentTab={currentTab}
              plan={plan}
              options={options}
              portfolioFit={portfolioFit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function TabBar({
  tabs,
  current,
  onChange,
}: {
  tabs: TabSpec[];
  current: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TabContent({
  currentTab,
  plan,
  options,
  portfolioFit,
}: {
  currentTab: TabId;
  plan: HowToBuy;
  options: OptionsOverlay | undefined;
  portfolioFit: PortfolioFit | undefined;
}) {
  switch (currentTab) {
    case "ladder":
      return <LadderTab plan={plan} />;
    case "sizing":
      return <SizingMathTab plan={plan} />;
    case "hold":
      return <HoldPeriodTab plan={plan} />;
    case "tax":
      return <TaxLotTab plan={plan} />;
    case "options":
      return options ? <OptionsOverlayTab data={options} /> : null;
    case "fit":
      return portfolioFit ? <PortfolioFitTab data={portfolioFit} /> : null;
    default:
      return null;
  }
}

// ── Defensive empty state ──────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="px-8 py-6 border-b border-slate-200">
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-2">
        How to buy this
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500">
        Could not generate a buy plan: {message}
      </div>
    </div>
  );
}
