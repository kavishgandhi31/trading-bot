import Link from "next/link";
import fs from "fs";
import path from "path";
import ScheduleManager from "./components/ScheduleManager";
import RecipientManager from "./components/RecipientManager";
import QuickGenerate from "./components/QuickGenerate";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

const VERDICT_STYLES: Record<string, { bg: string; text: string }> = {
  strong_buy: { bg: "bg-emerald-100", text: "text-emerald-700" },
  buy: { bg: "bg-emerald-100", text: "text-emerald-700" },
  hold: { bg: "bg-amber-100", text: "text-amber-700" },
  sell: { bg: "bg-red-100", text: "text-red-700" },
  strong_sell: { bg: "bg-red-100", text: "text-red-700" },
};

interface ReportSummary {
  slug: string;
  ticker: string;
  date: string;
  verdict: string;
  verdictLabel: string;
  conviction: number;
  summary: string;
  scores: { foundation: number; valuation: number; risk: number; technicals: number };
}

function loadReports(): ReportSummary[] {
  if (!fs.existsSync(REPORTS_DIR)) return [];

  const allFiles = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  // Keep only the latest report per ticker so the dashboard never shows duplicates.
  const seen = new Set<string>();
  const files: string[] = [];
  for (const f of allFiles) {
    const ticker = f.split("_")[0].toUpperCase();
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    files.push(f);
  }

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(REPORTS_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      const v = data.verdict || {};
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      const verdictKey = v.net_verdict || "hold";
      const labels: Record<string, string> = {
        strong_buy: "STRONG BUY", buy: "BUY", hold: "HOLD",
        sell: "SELL", strong_sell: "STRONG SELL",
      };
      return {
        slug: file.replace(".json", ""),
        ticker: data.ticker,
        date: dateMatch?.[1] ?? "",
        verdict: verdictKey,
        verdictLabel: labels[verdictKey] || "NEUTRAL",
        conviction: v.conviction_score ?? 0,
        summary: (v.verdict_summary || "").slice(0, 160),
        scores: {
          foundation: data.foundation?.foundation_score ?? 0,
          valuation: data.valuation?.valuation_score ?? 0,
          risk: data.risk?.risk_score ?? 0,
          technicals: data.technicals?.technicals_score ?? 0,
        },
      };
    });
}

function HeaderStat({
  label,
  value,
  sub,
  accent = "white",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "white" | "emerald";
}) {
  return (
    <div className="flex flex-col justify-center">
      <div className="text-[9.5px] font-bold tracking-[0.14em] uppercase text-slate-400 leading-none">
        {label}
      </div>
      <div
        className={`font-extrabold tracking-tight leading-none mt-1.5 ${
          accent === "emerald" ? "text-emerald-400" : "text-white"
        } ${value.length > 4 ? "text-[18px]" : "text-[22px]"}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10.5px] text-slate-400 font-mono mt-1 leading-none">
          {sub}
        </div>
      )}
    </div>
  );
}

function ScoreDot({ score, label }: { score: number; label: string }) {
  const color =
    score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-blue-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider w-7">{label}</span>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm font-semibold text-slate-700 font-mono">{score}</span>
    </div>
  );
}

export default function Dashboard() {
  const reports = loadReports();
  const latest = reports[0];
  const buySignals = reports.filter((r) => r.verdict === "buy" || r.verdict === "strong_buy").length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="relative bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden">
        {/* Soft emerald glow behind the logo for visual depth */}
        <div
          aria-hidden
          className="absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-[0.18]"
          style={{ background: "radial-gradient(circle, #059669 0%, transparent 60%)" }}
        />
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-7 pb-7">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            {/* Brand */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/20">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-extrabold tracking-tight leading-none">
                    Trading Bot
                  </h1>
                  <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                    Research
                  </span>
                </div>
                <p className="text-slate-400 text-[12.5px] mt-1 leading-snug">
                  AI-powered stock analysis, debated with Claude.
                </p>
              </div>
            </div>

            {/* Stats */}
            {reports.length > 0 && (
              <div className="flex items-stretch gap-5 text-white">
                <HeaderStat label="Reports" value={reports.length.toString()} />
                <div className="w-px bg-slate-700/80 self-stretch" />
                <HeaderStat label="Buy signals" value={buySignals.toString()} accent="emerald" />
                {latest && (
                  <>
                    <div className="w-px bg-slate-700/80 self-stretch" />
                    <HeaderStat label="Latest" value={latest.ticker} sub={latest.date} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Thin emerald accent line at the bottom */}
        <div
          aria-hidden
          className="relative h-px bg-gradient-to-r from-transparent via-emerald-600/50 to-transparent"
        />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <QuickGenerate />
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-slate-400 text-lg">No reports yet.</p>
            <p className="text-slate-400 text-sm mt-2">
              Run <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">python3.12 main.py NVDA</code> from <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">backend/</code> to generate one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {reports.length} Report{reports.length !== 1 ? "s" : ""}
            </h2>
            {reports.map((r) => {
              const vs = VERDICT_STYLES[r.verdict] || { bg: "bg-slate-100", text: "text-slate-600" };
              return (
                <div
                  key={r.slug}
                  className="relative bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <Link
                    href={`/report/${r.slug}`}
                    className="block p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {r.ticker}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded ${vs.bg} ${vs.text}`}>
                            {r.verdictLabel}
                          </span>
                          <span className="text-xs text-slate-400">{r.date}</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                          {r.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Conv.</div>
                          <div className="text-xl font-extrabold text-slate-800 font-mono">{r.conviction}</div>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <ScoreDot label="Fnd" score={r.scores.foundation} />
                          <ScoreDot label="Val" score={r.scores.valuation} />
                          <ScoreDot label="Rsk" score={r.scores.risk} />
                          <ScoreDot label="Tch" score={r.scores.technicals} />
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={`/report/${r.slug}?chat=1`}
                    className="absolute bottom-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-700 text-white flex items-center gap-1"
                    title={`Chat about ${r.ticker}`}
                  >
                    💬 Chat
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Email Recipients */}
        <div className="mt-10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
            Email Recipients
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            All scheduled reports with email enabled will be sent to every address in this list.
          </p>
          <RecipientManager />
        </div>

        {/* Scheduled Reports */}
        <div className="mt-10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
            Scheduled Reports
          </h2>
          <ScheduleManager />
        </div>
      </div>
    </div>
  );
}
