"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "running" | "success" | "failed";

export default function QuickGenerate() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [logTail, setLogTail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastTicker, setLastTicker] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) return;
    if (status === "running") return;

    setStatus("running");
    setError(null);
    setLogTail("Starting pipeline…");
    setLastTicker(normalized);

    try {
      const startRes = await fetch(`/api/schedules/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalized, sendEmail }),
      });
      if (!startRes.ok) throw new Error(await startRes.text());
      const { jobId } = (await startRes.json()) as { jobId: string };

      while (true) {
        await new Promise((r) => setTimeout(r, 2500));
        const pollRes = await fetch(`/api/schedules/run?jobId=${jobId}`);
        if (!pollRes.ok) throw new Error(await pollRes.text());
        const job = (await pollRes.json()) as {
          status: "running" | "success" | "failed";
          log: string;
          error: string | null;
        };
        const tail = job.log.split("\n").filter(Boolean).slice(-1)[0] ?? "";
        setLogTail(tail);
        if (job.status === "success") {
          setStatus("success");
          setTicker("");
          router.refresh();
          return;
        }
        if (job.status === "failed") {
          setStatus("failed");
          setError(job.error ?? "Pipeline failed");
          return;
        }
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const running = status === "running";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white text-sm font-bold">
          ✦
        </span>
        <h2 className="text-sm font-bold text-slate-900">Generate a report</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Run the 7-stage research pipeline on any ticker. Takes 3–8 minutes.
      </p>

      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="e.g. NVDA"
          disabled={running}
          className="flex-1 text-sm font-mono uppercase tracking-wide border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
          maxLength={10}
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700 select-none px-1 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={sendEmail}
            onClick={() => setSendEmail((s) => !s)}
            disabled={running}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
              sendEmail ? "bg-emerald-500" : "bg-slate-300"
            }`}
            title={sendEmail ? "Email the report when done" : "Save to dashboard only, no email"}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${
                sendEmail ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs font-medium">Email report</span>
        </label>

        <button
          type="submit"
          disabled={running || !ticker.trim()}
          className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
              </svg>
              Generating…
            </>
          ) : (
            "Generate"
          )}
        </button>
      </form>

      {status !== "idle" && (
        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
            status === "running"
              ? "bg-blue-50 text-blue-800"
              : status === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {status === "running" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <span className="truncate">
                <span className="font-semibold">{lastTicker}:</span> {logTail || "working…"}
              </span>
            </>
          )}
          {status === "success" && (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="flex-1">
                <span className="font-semibold">{lastTicker}</span> is ready — see it in the list below.
              </span>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-emerald-700 hover:text-emerald-900 shrink-0"
              >
                Dismiss
              </button>
            </>
          )}
          {status === "failed" && (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
              <span className="flex-1 truncate">
                <span className="font-semibold">{lastTicker} failed:</span> {error}
              </span>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-red-700 hover:text-red-900 shrink-0"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
