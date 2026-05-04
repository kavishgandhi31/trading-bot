"use client";

import { useState } from "react";
import { useJobs } from "@/app/jobs/JobsProvider";

export default function QuickGenerate() {
  const { startJob, activeJobs, isRunningFor } = useJobs();
  const [ticker, setTicker] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) return;
    setSubmitting(true);
    setError(null);
    try {
      const job = await startJob(normalized, { sendEmail });
      // If startJob returned a job, it actually started (or adopted). Otherwise
      // it was rejected (e.g. capacity reached) and the provider opened the
      // error modal — leave the input alone so the user can retry.
      if (job) setTicker("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Disable inputs only while we're round-tripping the start request. Up to
  // MAX_CONCURRENT pipelines may run in parallel; if the cap is reached the
  // provider opens the capacity-error modal.
  const busy = submitting;
  const typedTicker = ticker.trim().toUpperCase();
  const runningHere = !!typedTicker && isRunningFor(typedTicker);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white text-sm font-bold">
          ✦
        </span>
        <h2 className="text-sm font-bold text-slate-900">Generate a report</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Run the 7-stage research pipeline on any ticker. Takes 3–8 minutes —
        you can navigate away while it runs.
      </p>

      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="e.g. NVDA"
          disabled={busy}
          className="flex-1 text-sm font-mono uppercase tracking-wide border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
          maxLength={10}
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700 select-none px-1 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={sendEmail}
            onClick={() => setSendEmail((s) => !s)}
            disabled={busy}
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
          disabled={busy || !ticker.trim()}
          className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
              </svg>
              Starting…
            </>
          ) : runningHere ? (
            "Running…"
          ) : (
            "Generate"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-red-50 text-red-800">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
          <span className="flex-1 truncate">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeJobs.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          {activeJobs.length === 1 ? (
            <>
              A report for{" "}
              <span className="font-mono font-semibold text-slate-700">
                {activeJobs[0].ticker}
              </span>{" "}
              is generating in the background.
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-700">
                {activeJobs.length}
              </span>{" "}
              reports generating in the background:{" "}
              {activeJobs.map((j, i) => (
                <span key={j.id}>
                  <span className="font-mono font-semibold text-slate-700">
                    {j.ticker}
                  </span>
                  {i < activeJobs.length - 1 ? ", " : ""}
                </span>
              ))}
              .
            </>
          )}{" "}
          You&apos;ll see a notification when each one finishes.
        </p>
      )}
    </div>
  );
}
