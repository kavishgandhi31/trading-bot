/**
 * Dashboard — server component.
 *
 * Loads every report from disk, derives the dashboard-card shape (posture,
 * Right Now headline, conviction, scores), and hands off to <DashboardClient>
 * for filtering / sorting / rendering. Settings (recipients, portfolio,
 * schedules) live behind a single drawer in the top nav.
 *
 * Layout:
 *   ┌─ Top nav ─ wordmark · Settings ──────────────────────────┐
 *   ├──────────────────────────────────────────────────────────┤
 *   │   Hero greeting + counts                                  │
 *   │   QuickGenerate                                           │
 *   │   FilterBar (posture · sort)                              │
 *   │   DashboardCard list                                      │
 *   └──────────────────────────────────────────────────────────┘
 */

import fs from "fs";
import path from "path";
import { computeRightNowAction } from "./components/sections/howtobuy/logic";
import { parsePrice } from "./components/sections/howtobuy/types";
import type {
  HowToBuy,
  Posture,
} from "./components/sections/howtobuy/types";
import type { DashboardReport } from "./components/sections/dashboard/types";
import QuickGenerate from "./components/QuickGenerate";
import DashboardClient from "./components/sections/dashboard/DashboardClient";
import DashboardSettings from "./components/sections/dashboard/DashboardSettings";
import { POSTURE_ORDER, postureMeta } from "./components/sections/dashboard/postures";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

// ── Server-side: load + decorate every report ──────────────────────────────

function loadReports(): DashboardReport[] {
  if (!fs.existsSync(REPORTS_DIR)) return [];

  const allFiles = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  // Keep only the latest report per ticker.
  const seen = new Set<string>();
  const files: string[] = [];
  for (const f of allFiles) {
    const ticker = f.split("_")[0].toUpperCase();
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    files.push(f);
  }

  return files.map((file) => decorateReport(file));
}

function decorateReport(file: string): DashboardReport {
  const raw = fs.readFileSync(path.join(REPORTS_DIR, file), "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>;

  const verdict = (data.verdict as Record<string, unknown>) || {};
  const foundation = (data.foundation as Record<string, unknown>) || {};
  const valuation = (data.valuation as Record<string, unknown>) || {};
  const risk = (data.risk as Record<string, unknown>) || {};
  const technicals = (data.technicals as Record<string, unknown>) || {};
  const meta = (data.meta as Record<string, unknown>) || {};
  const plan = data.how_to_buy as HowToBuy | undefined;
  const verdictKey = (verdict.net_verdict as string) || "hold";

  const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? "";
  const refreshedAt =
    (typeof meta.generated_at === "string" && meta.generated_at) ||
    (date ? `${date}T00:00:00.000Z` : "");

  // Pull posture from the buy plan if available; otherwise fall back to a
  // verdict-derived guess for older reports.
  const posture: Posture = plan?.posture ?? guessPosture(verdictKey);

  // Compute the Right Now sentence server-side using the same logic the
  // report's hero strip uses, so the dashboard card and the report agree.
  const currentPrice = parsePrice(meta.current_price);
  const rightNowHeadline =
    plan && !plan.error
      ? computeRightNowAction(plan, currentPrice).headline
      : (verdict.verdict_summary as string) || "";

  return {
    slug: file.replace(".json", ""),
    ticker: String(data.ticker ?? "").toUpperCase(),
    date,
    verdict: verdictKey,
    conviction: Number(verdict.conviction_score) || 0,
    verdictSummary: (verdict.verdict_summary as string) || "",
    posture,
    totalAllocationPct:
      typeof plan?.total_allocation_pct === "number"
        ? plan.total_allocation_pct
        : null,
    rightNowHeadline,
    scores: {
      foundation: Number(foundation.foundation_score) || 0,
      valuation: Number(valuation.valuation_score) || 0,
      risk: Number(risk.risk_score) || 0,
      technicals: Number(technicals.technicals_score) || 0,
    },
    refreshedAt,
  };
}

function guessPosture(verdictKey: string): Posture {
  switch (verdictKey) {
    case "strong_buy":
      return "deploy_full";
    case "buy":
      return "deploy_partial";
    case "hold":
      return "watch_only";
    default:
      return "avoid";
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const reports = loadReports();
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <Greeting reports={reports} />
        <div className="mt-6 mb-8">
          <QuickGenerate />
        </div>
        {reports.length === 0 ? <EmptyState /> : <DashboardClient reports={reports} />}
      </main>
    </div>
  );
}

// ── Page-level pieces ──────────────────────────────────────────────────────

function TopNav() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              Trading Bot
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              Research
            </span>
          </div>
        </div>
        <DashboardSettings />
      </div>
    </header>
  );
}

function Greeting({ reports }: { reports: DashboardReport[] }) {
  const counts: Partial<Record<Posture, number>> = {};
  for (const r of reports) counts[r.posture] = (counts[r.posture] ?? 0) + 1;

  return (
    <div>
      <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
        What should I look at today?
      </h1>
      <div className="mt-2 flex items-center gap-2 flex-wrap text-[12.5px] text-slate-500">
        <span>
          <span className="font-semibold text-slate-900">{reports.length}</span>{" "}
          report{reports.length === 1 ? "" : "s"}
        </span>
        {POSTURE_ORDER.map((p) => {
          const count = counts[p] ?? 0;
          if (count === 0) return null;
          const meta = postureMeta(p);
          return (
            <span key={p} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.accent}`} />
                <span>
                  <span className="font-semibold text-slate-700">{count}</span>{" "}
                  {meta.label.toLowerCase()}
                </span>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <p className="text-slate-500 text-[15px]">No reports yet.</p>
      <p className="text-slate-400 text-[13px] mt-2">
        Use the form above, or run{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[12px] font-mono">
          python3.12 main.py NVDA
        </code>{" "}
        from{" "}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[12px] font-mono">
          backend/
        </code>{" "}
        to generate one.
      </p>
    </div>
  );
}

// Re-export the type so any future server code that hands data into the
// dashboard can import it from the page module if convenient.
export type { DashboardReport };
