import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import {
  createJob,
  appendLog,
  finishJob,
  getJob,
  listRecentJobs,
  runningJobForTicker,
} from "./jobs";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const { ticker, sendEmail = true } = await request.json();

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const normalizedTicker = String(ticker).toUpperCase();

  // If this ticker is already running, return the existing job instead of starting another.
  const existing = runningJobForTicker(normalizedTicker);
  if (existing) {
    return NextResponse.json(
      { jobId: existing.id, status: "running", alreadyRunning: true },
      { status: 200 }
    );
  }

  const cwd = process.cwd();
  const python = path.join(cwd, "backend", "venv", "bin", "python3.12");
  const backend = path.join(cwd, "backend");

  const job = createJob(normalizedTicker);

  const args = ["main.py", normalizedTicker];
  if (!sendEmail) args.splice(1, 0, "--no-email");

  const proc = spawn(python, args, {
    cwd: backend,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  proc.stdout.on("data", (d: Buffer) => appendLog(job.id, d.toString()));
  proc.stderr.on("data", (d: Buffer) => appendLog(job.id, d.toString()));

  const killTimer = setTimeout(() => {
    proc.kill();
    finishJob(job.id, { exitCode: null, error: "Timed out after 15 minutes" });
  }, TIMEOUT_MS);

  proc.on("close", (code: number) => {
    clearTimeout(killTimer);
    finishJob(job.id, { exitCode: code });
  });

  proc.on("error", (err: Error) => {
    clearTimeout(killTimer);
    finishJob(job.id, { exitCode: null, error: err.message });
  });

  // Return immediately — the pipeline keeps running in the background.
  return NextResponse.json({ jobId: job.id, status: "running" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (jobId) {
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  }

  // No jobId → return recent jobs (for UI state restoration after refresh).
  return NextResponse.json(listRecentJobs());
}
