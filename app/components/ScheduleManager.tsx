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

  async function deleteSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  }

  return (
    <div className="space-y-4">
      {/* Scheduler engine control */}
      <div className={`flex items-center justify-between rounded-lg px-5 py-3.5 border ${schedulerRunning ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${schedulerRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          <div>
            <span className="text-sm font-semibold text-slate-800">
              Scheduler {schedulerRunning ? "Running" : "Stopped"}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {schedulerRunning ? "Checks every hour for due reports" : "Enable to run reports automatically"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {schedulerLog && (
            <button
              onClick={() => setShowLog(!showLog)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            >
              {showLog ? "Hide log" : "View log"}
            </button>
          )}
          <button
            onClick={toggleScheduler}
            disabled={toggling}
            className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              schedulerRunning
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {toggling ? "..." : schedulerRunning ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      {/* Log viewer */}
      {showLog && schedulerLog && (
        <pre className="bg-slate-900 text-slate-300 rounded-lg px-4 py-3 text-xs leading-relaxed overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {schedulerLog}
        </pre>
      )}

      {/* Add form */}
      <form onSubmit={addSchedule} className="flex gap-3">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          className="flex-1 max-w-[140px] bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="monthly">Monthly</option>
        </select>
        <button
          type="submit"
          disabled={loading || !ticker.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add Schedule"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}

      {/* Schedule list */}
      {schedules.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">
          No schedules yet. Add a ticker above to start receiving automated reports.
        </p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 bg-white border rounded-lg px-5 py-3.5 transition-opacity ${s.enabled ? "border-slate-200" : "border-slate-200 opacity-50"}`}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleEnabled(s.id, !s.enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${s.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                title={s.enabled ? "Disable" : "Enable"}
              >
                <span
                  className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${s.enabled ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>

              {/* Ticker */}
              <span className="text-lg font-extrabold text-slate-900 tracking-tight w-16">
                {s.ticker}
              </span>

              {/* Frequency selector */}
              <select
                value={s.frequency}
                onChange={(e) => updateFrequency(s.id, e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded pl-2.5 pr-6 py-1 text-slate-600 focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat"
              >
                {Object.entries(FREQ_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Email toggle */}
              <button
                onClick={() => toggleEmail(s.id, !s.send_email)}
                className={`text-xs font-medium px-2.5 py-1 rounded cursor-pointer transition-colors ${s.send_email ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}
                title={s.send_email ? "Email enabled" : "Email disabled"}
              >
                {s.send_email ? "Email ON" : "Email OFF"}
              </button>

              {/* Last run */}
              <span className="text-xs text-slate-400 ml-auto">
                {s.last_run ? `Last run: ${timeAgo(s.last_run)}` : "Never run"}
              </span>

              {/* Delete */}
              <button
                onClick={() => deleteSchedule(s.id)}
                className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer text-lg leading-none"
                title="Remove schedule"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
