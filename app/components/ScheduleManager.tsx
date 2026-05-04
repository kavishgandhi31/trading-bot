"use client";

import { useState, useEffect, useCallback } from "react";

interface Schedule {
  id: string;
  ticker: string;
  frequency: string;
  preferred_time: string;
  send_email: boolean;
  enabled: boolean;
  last_run: string | null;
  created_at: string;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ticker, setTicker] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [schedulerLog, setSchedulerLog] = useState("");
  const [toggling, setToggling] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    setSchedules(await res.json());
  }, []);

  const fetchSchedulerStatus = useCallback(async () => {
    const res = await fetch("/api/scheduler");
    const data = await res.json();
    setSchedulerRunning(data.running);
    setSchedulerLog(data.log || "");
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchSchedulerStatus();
  }, [fetchSchedules, fetchSchedulerStatus]);

  async function toggleScheduler() {
    setToggling(true);
    const action = schedulerRunning ? "stop" : "start";
    const res = await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setSchedulerRunning(data.running);
    setToggling(false);
    fetchSchedulerStatus();
  }

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        frequency,
        send_email: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add schedule");
    } else {
      setTicker("");
    }

    setLoading(false);
    fetchSchedules();
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchSchedules();
  }

  async function toggleEmail(id: string, send_email: boolean) {
    await fetch(`/api/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send_email }),
    });
    fetchSchedules();
  }

  async function updateFrequency(id: string, frequency: string) {
    await fetch(`/api/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency }),
    });
    fetchSchedules();
  }

  async function deleteSchedule(id: string, tickerName: string) {
    if (!confirm(`Remove the ${tickerName} schedule? This does not delete any existing reports.`)) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  }

  return (
    <div className="space-y-4">
      {/* Automation engine control */}
      <div
        className={`rounded-lg p-5 border ${
          schedulerRunning ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                schedulerRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              }`}
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Automation engine {schedulerRunning ? "is on" : "is off"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {schedulerRunning
                  ? "A macOS background process checks every hour for any enabled schedule that's due."
                  : "Turn this on and enabled schedules below will run automatically at their chosen cadence."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {schedulerLog && (
              <button
                onClick={() => setShowLog(!showLog)}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showLog ? "Hide log" : "View log"}
              </button>
            )}
            <button
              onClick={toggleScheduler}
              disabled={toggling}
              className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                schedulerRunning
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {toggling ? "…" : schedulerRunning ? "Turn off" : "Turn on"}
            </button>
          </div>
        </div>
      </div>

      {/* Log viewer */}
      {showLog && schedulerLog && (
        <pre className="bg-slate-900 text-slate-300 rounded-lg px-4 py-3 text-xs leading-relaxed overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {schedulerLog}
        </pre>
      )}

      {/* Add schedule form */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Add a recurring ticker
        </div>
        <form onSubmit={addSchedule} className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. NVDA"
            className="flex-1 sm:flex-none sm:w-[140px] min-w-0 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-slate-500"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:border-slate-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
          >
            {Object.entries(FREQ_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !ticker.trim()}
            className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:cursor-not-allowed"
          >
            {loading ? "Adding…" : "Add schedule"}
          </button>
        </form>
        {error && <p className="text-xs text-red-600 font-medium mt-2">{error}</p>}
      </div>

      {/* Schedule list. Card-per-schedule layout — flexes properly in narrow
          containers like the settings drawer (the previous fixed-column grid
          collided with itself below ~600px). */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 px-5 py-8 text-center">
          <p className="text-sm text-slate-500">No recurring schedules yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add a ticker above to run it automatically.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li
              key={s.id}
              className={`bg-white rounded-lg border border-slate-200 p-5 ${
                s.enabled ? "" : "opacity-60"
              }`}
            >
              {/* Top row: identity + primary controls */}
              <div className="flex items-center gap-2.5">
                {/* Active toggle */}
                <button
                  onClick={() => toggleEnabled(s.id, !s.enabled)}
                  role="switch"
                  aria-checked={s.enabled}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                    s.enabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={s.enabled ? "Enabled — pause this schedule" : "Paused — click to resume"}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] bg-white rounded-full shadow transition-transform duration-200 ${
                      s.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Ticker */}
                <span className="text-[15px] font-extrabold font-mono text-slate-900 tracking-tight shrink-0 min-w-[60px]">
                  {s.ticker}
                </span>

                {/* Frequency select */}
                <select
                  value={s.frequency}
                  onChange={(e) => updateFrequency(s.id, e.target.value)}
                  disabled={!s.enabled}
                  className="flex-1 min-w-0 text-[12px] bg-slate-50 border border-slate-200 rounded-md pl-2.5 pr-7 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-slate-400 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat disabled:opacity-60"
                  title="How often this ticker runs"
                >
                  {Object.entries(FREQ_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>

                {/* Email toggle */}
                <button
                  onClick={() => toggleEmail(s.id, !s.send_email)}
                  className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                    s.send_email
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title={
                    s.send_email
                      ? "Emails go to all recipients when this runs. Click to disable."
                      : "Emails off. Report still saves to the dashboard. Click to enable."
                  }
                  aria-label={s.send_email ? "Email enabled" : "Email disabled"}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {s.send_email ? "On" : "Off"}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteSchedule(s.id, s.ticker)}
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-slate-100 transition-colors"
                  title="Remove this schedule"
                  aria-label={`Remove ${s.ticker} schedule`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {/* Bottom meta line — aligns to card's left edge (not the
                  ticker), so the card's padding reads even on all sides. */}
              <div className="text-[11px] text-slate-400 mt-2">
                Last run:{" "}
                <span className="text-slate-600 font-medium">
                  {s.last_run ? timeAgo(s.last_run) : "Never"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
