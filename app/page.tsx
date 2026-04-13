import Link from "next/link";
import fs from "fs";
import path from "path";
import ScheduleManager from "./components/ScheduleManager";

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

  return fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
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

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Trading Bot</h1>
          <p className="text-slate-400 text-sm mt-1">AI-powered stock research reports</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
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
                <Link
                  key={r.slug}
                  href={`/report/${r.slug}`}
                  className="block bg-white rounded-xl p-6 hover:shadow-md transition-shadow border border-slate-200"
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
              );
            })}
          </div>
        )}

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
