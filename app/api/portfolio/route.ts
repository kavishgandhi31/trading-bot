import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PORTFOLIO_FILE = path.join(process.cwd(), "backend", "portfolio.json");

interface Holding {
  ticker: string;
  pct_of_portfolio: number;
  thesis?: string;
}

interface Portfolio {
  current_holdings: Holding[];
  sector_exposure_pcts: Record<string, number>;
  max_single_position_pct: number | null;
  max_sector_exposure_pct: number | null;
  total_portfolio_value: string;
  notes: string;
}

const EMPTY: Portfolio = {
  current_holdings: [],
  sector_exposure_pcts: {},
  max_single_position_pct: null,
  max_sector_exposure_pct: null,
  total_portfolio_value: "",
  notes: "",
};

function readPortfolio(): Portfolio {
  if (!fs.existsSync(PORTFOLIO_FILE)) return EMPTY;
  try {
    const raw = fs.readFileSync(PORTFOLIO_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function writePortfolio(data: Portfolio) {
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2));
}

function sanitizeHolding(h: unknown): Holding | null {
  if (typeof h !== "object" || h === null) return null;
  const obj = h as Record<string, unknown>;
  const ticker = String(obj.ticker ?? "").trim().toUpperCase();
  const pct = Number(obj.pct_of_portfolio);
  if (!ticker || !Number.isFinite(pct) || pct < 0) return null;
  const thesis =
    typeof obj.thesis === "string" && obj.thesis.trim()
      ? obj.thesis.trim()
      : undefined;
  return { ticker, pct_of_portfolio: pct, ...(thesis ? { thesis } : {}) };
}

function sanitizeSectorMap(m: unknown): Record<string, number> {
  if (typeof m !== "object" || m === null) return {};
  const out: Record<string, number> = {};
  for (const [sector, value] of Object.entries(m as Record<string, unknown>)) {
    const trimmed = sector.trim();
    const num = Number(value);
    if (trimmed && Number.isFinite(num) && num >= 0) out[trimmed] = num;
  }
  return out;
}

function sanitizePortfolio(input: unknown): Portfolio {
  const data = (input ?? {}) as Record<string, unknown>;
  const holdings = Array.isArray(data.current_holdings)
    ? data.current_holdings
        .map(sanitizeHolding)
        .filter((h): h is Holding => h !== null)
    : [];

  const max_single =
    data.max_single_position_pct === null ||
    data.max_single_position_pct === undefined ||
    data.max_single_position_pct === ""
      ? null
      : Number(data.max_single_position_pct);
  const max_sector =
    data.max_sector_exposure_pct === null ||
    data.max_sector_exposure_pct === undefined ||
    data.max_sector_exposure_pct === ""
      ? null
      : Number(data.max_sector_exposure_pct);

  return {
    current_holdings: holdings,
    sector_exposure_pcts: sanitizeSectorMap(data.sector_exposure_pcts),
    max_single_position_pct:
      max_single !== null && Number.isFinite(max_single) ? max_single : null,
    max_sector_exposure_pct:
      max_sector !== null && Number.isFinite(max_sector) ? max_sector : null,
    total_portfolio_value:
      typeof data.total_portfolio_value === "string"
        ? data.total_portfolio_value
        : "",
    notes: typeof data.notes === "string" ? data.notes : "",
  };
}

export async function GET() {
  return NextResponse.json(readPortfolio());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const sanitized = sanitizePortfolio(body);
  writePortfolio(sanitized);
  return NextResponse.json(sanitized);
}

export async function DELETE() {
  if (fs.existsSync(PORTFOLIO_FILE)) fs.unlinkSync(PORTFOLIO_FILE);
  return NextResponse.json(EMPTY);
}
