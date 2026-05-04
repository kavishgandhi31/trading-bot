"use client";

import { useEffect, useState } from "react";
import type { Job } from "./types";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  activeJobs: Job[];
  onCancel: (jobId: string) => void | Promise<void>;
}

interface PillProps {
  job: Job;
  now: number;
  onCancel: (jobId: string) => void | Promise<void>;
}

function Pill({ job, now, onCancel }: PillProps) {
  const elapsed = formatElapsed(now - job.startedAt);
  return (
    <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-sm text-white pl-3 pr-1.5 py-1.5 rounded-full shadow-lg border border-white/10 ring-1 ring-emerald-400/10 animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]">
      <span className="relative flex w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
        <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
      </span>
      <div className="flex items-baseline gap-1.5 text-[12.5px] font-medium">
        <span className="text-slate-300">Generating</span>
        <span className="font-mono font-bold tracking-tight text-white">
          {job.ticker}
        </span>
        <span className="text-slate-500 font-mono text-[11px]">{elapsed}</span>
      </div>
      <button
        type="button"
        onClick={() => onCancel(job.id)}
        aria-label={`Cancel ${job.ticker} generation`}
        title={`Cancel ${job.ticker}`}
        className="ml-1 w-6 h-6 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function JobIndicator({ activeJobs, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (activeJobs.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeJobs.length]);

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2 select-none">
      {activeJobs.map((job) => (
        <Pill key={job.id} job={job} now={now} onCancel={onCancel} />
      ))}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
