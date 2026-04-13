import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

export async function GET() {
  if (!fs.existsSync(REPORTS_DIR)) {
    return NextResponse.json([]);
  }

  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  const reports = files.map((file) => {
    const raw = fs.readFileSync(path.join(REPORTS_DIR, file), "utf-8");
    const data = JSON.parse(raw);
    const verdict = data.verdict || {};
    const trade = data.trade_setup || {};
    // Extract date from filename like NVDA_2026-04-12.json
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    return {
      slug: file.replace(".json", ""),
      ticker: data.ticker,
      date: dateMatch?.[1] ?? "",
      verdict: verdict.net_verdict ?? "hold",
      conviction: verdict.conviction_score ?? 0,
      verdictSummary: verdict.verdict_summary ?? "",
      scores: {
        foundation: data.foundation?.foundation_score ?? 0,
        valuation: data.valuation?.valuation_score ?? 0,
        risk: data.risk?.risk_score ?? 0,
        technicals: data.technicals?.technicals_score ?? 0,
      },
      baseTarget: trade.price_targets?.base?.price ?? null,
      entryZone: trade.entry_zone ?? null,
    };
  });

  return NextResponse.json(reports);
}
