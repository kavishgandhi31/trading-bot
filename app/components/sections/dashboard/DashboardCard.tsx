"use client";

/**
 * A single report card on the dashboard list.
 *
 * Layout, left to right:
 *   • A 4-px posture-colored accent stripe (the only color on the card edges)
 *   • Main column: ticker + verdict pill + Right Now sentence in quotes +
 *     one-line meta (posture · % of budget · refreshed N days ago) + score row
 *   • Right column: regenerate / chat actions
 *
 * Whole card is a Link that opens the report. Action buttons stop the click
 * from propagating so they fire their own handlers.
 */

import Link from "next/link";
import { verdictMeta } from "@/app/design/verdict";
import { scoreMeta } from "@/app/design/scores";
import { postureMeta } from "./postures";
import ReportActions from "@/app/components/ReportActions";
import type { DashboardReport } from "./types";

interface Props {
  report: DashboardReport;
}

export default function DashboardCard({ report }: Props) {
  const v = verdictMeta(report.verdict);
  const p = postureMeta(report.posture);

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
      {/* Posture accent stripe */}
      <div
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 ${p.accent}`}
      />

      <Link href={`/report/${report.slug}`} className="block p-5 pl-6 pb-14">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          {/* Main column */}
          <div className="flex-1 min-w-0">
            <Header report={report} verdictMeta={v} postureMeta={p} />
            <RightNow text={report.rightNowHeadline} />
            <MetaLine report={report} postureMeta={p} />
            <ScoresRow scores={report.scores} />
          </div>

          {/* Conviction stat — visually demoted, only meaningful at a glance */}
          <div className="shrink-0 hidden sm:flex flex-col items-center justify-center pl-5 border-l border-slate-100 self-stretch">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400">
              Conviction
            </div>
            <div className="text-[28px] font-extrabold text-slate-900 font-mono leading-none mt-1.5">
              {report.conviction}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">/10</div>
          </div>
        </div>
      </Link>

      {/* Action buttons — sit on top of the Link, swallow click events */}
      <ReportActions slug={report.slug} ticker={report.ticker} variant="card" />

      {/* Chat shortcut */}
      <Link
        href={`/report/${report.slug}?chat=1`}
        className="absolute bottom-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-700 text-white inline-flex items-center gap-1.5"
        title={`Chat about ${report.ticker}`}
      >
        <span>💬</span>
        Chat
      </Link>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Header({
  report,
  verdictMeta: v,
  postureMeta: p,
}: {
  report: DashboardReport;
  verdictMeta: ReturnType<typeof verdictMeta>;
  postureMeta: ReturnType<typeof postureMeta>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-2">
      <span className="text-[22px] font-extrabold text-slate-900 tracking-tight font-mono leading-none">
        {report.ticker}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 ${v.bg} ${v.border} border ${v.text} text-[11px] font-bold rounded-full px-2 py-0.5`}
      >
        <span className={`w-1 h-1 rounded-full ${v.dot}`} />
        {v.short}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 ${p.bg} ${p.border} border ${p.text} text-[10.5px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5`}
        title={p.tooltip}
      >
        {p.label}
      </span>
    </div>
  );
}

function RightNow({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="text-[14px] text-slate-700 leading-snug font-medium mb-2.5">
      &ldquo;{text}&rdquo;
    </p>
  );
}

function MetaLine({
  report,
  postureMeta: p,
}: {
  report: DashboardReport;
  postureMeta: ReturnType<typeof postureMeta>;
}) {
  const parts: React.ReactNode[] = [];
  if (report.totalAllocationPct !== null && p.actionable) {
    parts.push(
      <span key="alloc">
        <span className="font-semibold text-slate-700">
          {report.totalAllocationPct}%
        </span>{" "}
        of budget
      </span>
    );
  }
  parts.push(
    <span key="refreshed" title={report.refreshedAt}>
      Updated {timeAgo(report.refreshedAt)}
    </span>
  );

  return (
    <div className="flex items-center gap-2 text-[11.5px] text-slate-500 mb-3">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300" />}
          {part}
        </span>
      ))}
    </div>
  );
}

function ScoresRow({
  scores,
}: {
  scores: DashboardReport["scores"];
}) {
  const items: Array<{ label: string; value: number }> = [
    { label: "Foundation", value: scores.foundation },
    { label: "Valuation", value: scores.valuation },
    { label: "Risk", value: scores.risk },
    { label: "Technicals", value: scores.technicals },
  ];
  return (
    <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
      {items.map((s) => {
        const meta = scoreMeta(s.value);
        return (
          <div
            key={s.label}
            className="flex items-center gap-1.5"
            title={`${s.label}: ${s.value}/10 — ${meta.meaning}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {s.label.slice(0, 3)}
            </span>
            <span className={`text-[12px] font-mono font-bold ${meta.text}`}>
              {s.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
