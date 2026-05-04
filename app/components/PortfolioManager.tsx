"use client";

import { useCallback, useEffect, useState } from "react";

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

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PortfolioManager() {
  const [data, setData] = useState<Portfolio>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expanded, setExpanded] = useState(false);

  // New-row inputs
  const [newTicker, setNewTicker] = useState("");
  const [newPct, setNewPct] = useState("");
  const [newThesis, setNewThesis] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newSectorPct, setNewSectorPct] = useState("");

  const fetchPortfolio = useCallback(async () => {
    const res = await fetch("/api/portfolio", { cache: "no-store" });
    if (res.ok) {
      const p = (await res.json()) as Portfolio;
      setData({ ...EMPTY, ...p });
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  async function save(next: Portfolio) {
    setSaveState("saving");
    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as Portfolio;
      setData(saved);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("error");
    }
  }

  function addHolding(e: React.FormEvent) {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    const pct = Number(newPct);
    if (!ticker || !Number.isFinite(pct) || pct <= 0) return;
    const exists = data.current_holdings.some((h) => h.ticker === ticker);
    const next = exists
      ? {
          ...data,
          current_holdings: data.current_holdings.map((h) =>
            h.ticker === ticker
              ? { ticker, pct_of_portfolio: pct, thesis: newThesis.trim() || undefined }
              : h
          ),
        }
      : {
          ...data,
          current_holdings: [
            ...data.current_holdings,
            { ticker, pct_of_portfolio: pct, ...(newThesis.trim() ? { thesis: newThesis.trim() } : {}) },
          ],
        };
    setNewTicker("");
    setNewPct("");
    setNewThesis("");
    save(next);
  }

  function removeHolding(ticker: string) {
    save({
      ...data,
      current_holdings: data.current_holdings.filter((h) => h.ticker !== ticker),
    });
  }

  function addSector(e: React.FormEvent) {
    e.preventDefault();
    const sector = newSector.trim();
    const pct = Number(newSectorPct);
    if (!sector || !Number.isFinite(pct) || pct < 0) return;
    setNewSector("");
    setNewSectorPct("");
    save({
      ...data,
      sector_exposure_pcts: { ...data.sector_exposure_pcts, [sector]: pct },
    });
  }

  function removeSector(sector: string) {
    const next = { ...data.sector_exposure_pcts };
    delete next[sector];
    save({ ...data, sector_exposure_pcts: next });
  }

  function updateCaps(field: "max_single_position_pct" | "max_sector_exposure_pct", v: string) {
    const num = v === "" ? null : Number(v);
    save({ ...data, [field]: num !== null && Number.isFinite(num) ? num : null });
  }

  function updateNotes(v: string) {
    setData({ ...data, notes: v });
  }
  function commitNotes() {
    save(data);
  }

  const totalAllocated = data.current_holdings.reduce(
    (s, h) => s + (h.pct_of_portfolio || 0),
    0
  );
  const isEmpty =
    data.current_holdings.length === 0 &&
    Object.keys(data.sector_exposure_pcts).length === 0 &&
    !data.max_single_position_pct &&
    !data.max_sector_exposure_pct;

  if (!loaded) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-400">
        Loading portfolio…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* ── Collapsed header ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold">
            ▦
          </span>
          <div className="text-left min-w-0">
            <div className="text-sm font-bold text-slate-900">Your portfolio context</div>
            <div className="text-[11.5px] text-slate-500 leading-snug truncate">
              {isEmpty
                ? "Optional. Adds personalized concentration & overlap checks to every report."
                : `${data.current_holdings.length} holding${data.current_holdings.length !== 1 ? "s" : ""} · ${Object.keys(data.sector_exposure_pcts).length} sector${Object.keys(data.sector_exposure_pcts).length !== 1 ? "s" : ""} · ${totalAllocated.toFixed(0)}% allocated`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveState === "saving" && (
            <span className="text-[11px] text-slate-400">Saving…</span>
          )}
          {saveState === "saved" && (
            <span className="text-[11px] text-emerald-600 font-semibold">Saved</span>
          )}
          {saveState === "error" && (
            <span className="text-[11px] text-red-600 font-semibold">Save failed</span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 p-5 space-y-6">
          {/* ── Caps row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Max single position (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={data.max_single_position_pct ?? ""}
                onChange={(e) => updateCaps("max_single_position_pct", e.target.value)}
                placeholder="e.g. 10"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Max sector exposure (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={data.max_sector_exposure_pct ?? ""}
                onChange={(e) => updateCaps("max_sector_exposure_pct", e.target.value)}
                placeholder="e.g. 30"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Total portfolio value (optional)
              </label>
              <input
                type="text"
                value={data.total_portfolio_value}
                onChange={(e) => setData({ ...data, total_portfolio_value: e.target.value })}
                onBlur={commitNotes}
                placeholder="e.g. $500k or 500000"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* ── Holdings ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Current holdings
              </div>
              {data.current_holdings.length > 0 && (
                <div className="text-[11px] text-slate-500">
                  Total allocated:{" "}
                  <span className={`font-semibold ${totalAllocated > 100 ? "text-red-600" : "text-slate-900"}`}>
                    {totalAllocated.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {data.current_holdings.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 w-20">Ticker</th>
                      <th className="text-left px-3 py-2 w-24">% of port</th>
                      <th className="text-left px-3 py-2">Thesis</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.current_holdings.map((h) => (
                      <tr key={h.ticker} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">
                          {h.ticker}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {h.pct_of_portfolio}%
                        </td>
                        <td className="px-3 py-2 text-[12.5px] text-slate-600">
                          {h.thesis ?? <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="px-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeHolding(h.ticker)}
                            className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none px-2"
                            title={`Remove ${h.ticker}`}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={addHolding} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                placeholder="Ticker"
                maxLength={10}
                className="col-span-3 sm:col-span-2 text-sm font-mono uppercase border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <input
                type="number"
                value={newPct}
                onChange={(e) => setNewPct(e.target.value)}
                placeholder="% of port"
                min="0"
                max="100"
                step="0.1"
                className="col-span-3 sm:col-span-2 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <input
                type="text"
                value={newThesis}
                onChange={(e) => setNewThesis(e.target.value)}
                placeholder="Thesis (optional)"
                className="col-span-4 sm:col-span-6 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={!newTicker.trim() || !newPct}
                className="col-span-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold px-3 py-2 rounded-lg shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* ── Sector exposure ──────────────────────────────────────── */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Sector exposure
            </div>

            {Object.keys(data.sector_exposure_pcts).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(data.sector_exposure_pcts).map(([sector, pct]) => (
                  <span
                    key={sector}
                    className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-[12px]"
                  >
                    <span className="font-semibold text-slate-700">{sector}</span>
                    <span className="font-mono font-bold text-slate-900">{pct}%</span>
                    <button
                      type="button"
                      onClick={() => removeSector(sector)}
                      className="text-slate-400 hover:text-red-500 leading-none"
                      title={`Remove ${sector}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form onSubmit={addSector} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                placeholder="Sector (e.g. Technology)"
                className="col-span-7 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <input
                type="number"
                value={newSectorPct}
                onChange={(e) => setNewSectorPct(e.target.value)}
                placeholder="%"
                min="0"
                max="100"
                step="0.5"
                className="col-span-3 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={!newSector.trim() || !newSectorPct}
                className="col-span-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold px-3 py-2 rounded-lg shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* ── Notes ────────────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Notes (free text — passed to the AI)
            </label>
            <textarea
              value={data.notes}
              onChange={(e) => updateNotes(e.target.value)}
              onBlur={commitNotes}
              placeholder="e.g. Aggressive growth tilt, comfortable with high-beta names, no leverage."
              rows={2}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 resize-none"
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Stored locally in <code className="font-mono">backend/portfolio.json</code>. Used by every report&apos;s
            Portfolio Fit section to flag concentration overlap and recommend allocation adjustments.
          </p>
        </div>
      )}
    </div>
  );
}
