import { randomUUID } from "crypto";

export interface Job {
  id: string;
  ticker: string;
  status: "running" | "success" | "failed";
  log: string;
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
}

// Attach to globalThis so the job map survives Next.js dev-mode hot reloads.
const g = globalThis as unknown as { __runJobs?: Map<string, Job> };
if (!g.__runJobs) g.__runJobs = new Map();
const jobs = g.__runJobs;

const MAX_JOBS = 50;

function trim() {
  if (jobs.size <= MAX_JOBS) return;
  const sorted = Array.from(jobs.values()).sort((a, b) => a.startedAt - b.startedAt);
  const excess = jobs.size - MAX_JOBS;
  for (let i = 0; i < excess; i++) jobs.delete(sorted[i].id);
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
