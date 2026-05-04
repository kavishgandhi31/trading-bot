"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJobs } from "@/app/jobs/JobsProvider";

type Variant = "card" | "detail";
type EmailStatus = "idle" | "sending" | "sent" | "failed";

interface Props {
  slug: string;
  ticker: string;
  variant: Variant;
}

export default function ReportActions({ slug, ticker, variant }: Props) {
  const router = useRouter();
  const { startJob, isRunningFor } = useJobs();

  const [deleting, setDeleting] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const running = isRunningFor(ticker);

  async function regenerate(email: boolean) {
    if (submitting || running) {
      // If already running for this ticker, the provider's startJob will
      // adopt — but UI-wise we just no-op for clarity.
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await startJob(ticker, { sendEmail: email });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function emailReport() {
    if (emailStatus === "sending") return;
    setEmailStatus("sending");
    setEmailError(null);
    try {
      const res = await fetch(`/api/reports/${slug}/email`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setEmailStatus("sent");
    } catch (err) {
      setEmailStatus("failed");
      setEmailError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove() {
    if (deleting) return;
    if (!confirm(`Remove the ${ticker} report from the dashboard? The file is moved to the archive, not permanently deleted.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (variant === "detail") {
        router.push("/");
        return;
      }
      router.refresh();
    } catch (err) {
      setDeleting(false);
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  if (variant === "card") {
    return (
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
        {running && (
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700"
            title="Currently regenerating in the background"
          >
            Regenerating…
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            regenerate(false);
          }}
          disabled={submitting || running || deleting}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 disabled:opacity-40"
          title={`Regenerate ${ticker} report (no email)`}
          aria-label={`Regenerate ${ticker}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={running || submitting ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-3.22-6.93" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            remove();
          }}
          disabled={submitting || running || deleting}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 disabled:opacity-40"
          title={`Remove ${ticker} from dashboard`}
          aria-label={`Remove ${ticker}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    );
  }

  // Detail variant — a bar with labelled buttons + email toggle.
  return (
    <div className="px-8 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">Report actions</span>
        <span className="text-slate-400">Regenerating overwrites today&apos;s report or creates a new one, then archives older copies.</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={emailReport}
          disabled={emailStatus === "sending" || submitting}
          className="border border-slate-300 bg-white hover:border-slate-400 hover:text-slate-900 disabled:opacity-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          title="Send the current saved report by email — no regeneration"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {emailStatus === "sending"
            ? "Sending…"
            : emailStatus === "sent"
            ? "Email sent"
            : "Email this report"}
        </button>
        <span className="w-px h-5 bg-slate-300" />
        <label className="flex items-center gap-2 text-[11.5px] text-slate-600 select-none">
          <button
            type="button"
            role="switch"
            aria-checked={sendEmail}
            onClick={() => setSendEmail((s) => !s)}
            disabled={submitting}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
              sendEmail ? "bg-emerald-500" : "bg-slate-300"
            }`}
            title={sendEmail ? "Email the regenerated report" : "Don't email — save only"}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] bg-white rounded-full shadow transition-transform duration-200 ${
                sendEmail ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="font-medium">Email on regenerate</span>
        </label>
        <button
          type="button"
          onClick={() => regenerate(sendEmail)}
          disabled={submitting || running}
          className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={submitting || running ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-3.22-6.93" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          {running ? "Regenerating…" : submitting ? "Starting…" : "Regenerate"}
        </button>
      </div>
      {error && (
        <div className="w-full text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
          Failed to start: {error}
        </div>
      )}
      {emailStatus === "failed" && emailError && (
        <div className="w-full text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
          Email failed: {emailError}
        </div>
      )}
      {emailStatus === "sent" && (
        <div className="w-full text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
          Report emailed to your configured recipients.
        </div>
      )}
    </div>
  );
}
