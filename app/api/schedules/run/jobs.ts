import type { ChildProcess } from "child_process";
import { randomUUID } from "crypto";

export type JobStatus = "running" | "success" | "failed" | "cancelled";

export interface Job {
  id: string;
  ticker: string;
  status: JobStatus;
  log: string;
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
}

// Attach to globalThis so the maps survive Next.js dev-mode hot reloads.
const g = globalThis as unknown as {
  __runJobs?: Map<string, Job>;
  __runProcs?: Map<string, ChildProcess>;
};
if (!g.__runJobs) g.__runJobs = new Map();
if (!g.__runProcs) g.__runProcs = new Map();
const jobs = g.__runJobs;
const procs = g.__runProcs;

const MAX_JOBS = 50;

/**
 * Maximum number of pipelines that may run concurrently. Tune up/down here —
 * each running pipeline holds a Python process plus outbound API quota
 * (Anthropic, SEC, YouTube, etc.).
 */
export const MAX_CONCURRENT = 3;

function trim() {
  if (jobs.size <= MAX_JOBS) return;
  const sorted = Array.from(jobs.values()).sort((a, b) => a.startedAt - b.startedAt);
  const excess = jobs.size - MAX_JOBS;
  for (let i = 0; i < excess; i++) {
    const j = sorted[i];
    jobs.delete(j.id);
    procs.delete(j.id);
  }
}

export function createJob(ticker: string): Job {
  const job: Job = {
    id: randomUUID(),
    ticker,
    status: "running",
    log: "",
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
    exitCode: null,
  };
  jobs.set(job.id, job);
  trim();
  return job;
}

export function attachProc(jobId: string, proc: ChildProcess) {
  procs.set(jobId, proc);
}

export function appendLog(jobId: string, chunk: string) {
  const job = jobs.get(jobId);
  if (job) job.log += chunk;
}

export function finishJob(
  jobId: string,
  opts: { exitCode: number | null; error?: string }
) {
  const job = jobs.get(jobId);
  if (!job) return;
  // Cancellation already wrote a terminal state; don't overwrite it from the
  // close handler that fires when we kill the process.
  if (job.status !== "running") return;
  job.finishedAt = Date.now();
  job.exitCode = opts.exitCode;
  if (opts.error) {
    job.status = "failed";
    job.error = opts.error;
  } else if (opts.exitCode === 0) {
    job.status = "success";
  } else {
    job.status = "failed";
    job.error = `Pipeline exited with code ${opts.exitCode}`;
  }
  procs.delete(jobId);
}

export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status !== "running") return false;
  job.status = "cancelled";
  job.finishedAt = Date.now();
  job.error = "Cancelled by user";
  const proc = procs.get(jobId);
  if (proc && !proc.killed) {
    try {
      proc.kill("SIGTERM");
    } catch {
      // best-effort; proc may already be exiting
    }
  }
  procs.delete(jobId);
  return true;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function listRecentJobs(limit = 10): Job[] {
  return Array.from(jobs.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

export function runningJobForTicker(ticker: string): Job | undefined {
  for (const job of jobs.values()) {
    if (job.ticker === ticker && job.status === "running") return job;
  }
  return undefined;
}

export function anyRunningJob(): Job | undefined {
  for (const job of jobs.values()) {
    if (job.status === "running") return job;
  }
  return undefined;
}

export function runningJobsCount(): number {
  let count = 0;
  for (const job of jobs.values()) if (job.status === "running") count++;
  return count;
}

export function listRunningJobs(): Job[] {
  return Array.from(jobs.values()).filter((j) => j.status === "running");
}
