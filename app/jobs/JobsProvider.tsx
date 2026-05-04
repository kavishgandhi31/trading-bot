"use client";

/**
 * JobsProvider — single source of truth on the client for in-flight report
 * generation jobs.
 *
 * Architecture
 * ────────────
 * • Server (app/api/schedules/run) owns the actual processes and authoritative
 *   state. Up to MAX_CONCURRENT pipelines may run at once; the server returns
 *   409 with a CapacityError payload when the cap is hit.
 * • This provider is a thin client mirror: polls the server while there are
 *   running jobs, adopts running jobs on mount, and renders the global modal
 *   layer + per-job indicator pills.
 * • UI affordances (QuickGenerate, ReportActions) call `startJob` from
 *   `useJobs()`. They never poll themselves; they read shared state.
 *
 * Modal layer
 * ───────────
 * • Capacity reached → red modal with the running tickers, dismissable.
 * • Job finished (success/fail) → success/fail modal. Multiple completions
 *   queue so we never stack overlays — the next pops after dismiss.
 *
 * Extending this
 * ──────────────
 * • SSE/websocket updates: replace the polling effect, keep the consumer API.
 * • Cancellable queue (4th request waits): add a client- or server-side
 *   queue between `startJob` and `actuallyStart`.
 * • Multi-job log drawer: read `jobs` from the hook.
 */

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CapacityError, Job, StartJobOptions } from "./types";
import JobIndicator from "./JobIndicator";
import JobModals from "./JobModals";

const POLL_MS = 2500;

interface CompletionEntry {
  job: Job;
  slug: string | null;
}

interface JobsContextValue {
  /** All jobs we currently know about, keyed by id. */
  jobs: Record<string, Job>;
  /** All running jobs, in start order (oldest first). */
  activeJobs: Job[];
  /** Lookup helper for components scoped to one ticker. */
  getJobForTicker: (ticker: string) => Job | undefined;
  /** Returns true if a job is running for that ticker. */
  isRunningFor: (ticker: string) => boolean;
  /**
   * Start a new generation job. Returns the started job, the existing job if
   * the same ticker is already running, or null if the request was rejected
   * (the provider opens an error modal on capacity errors).
   */
  startJob: (
    ticker: string,
    opts?: StartJobOptions
  ) => Promise<Job | null>;
  /** Cancel a specific job. */
  cancelJob: (jobId: string) => Promise<void>;
}

const JobsContext = createContext<JobsContextValue | null>(null);

export function useJobs(): JobsContextValue {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used inside <JobsProvider>");
  return ctx;
}

/** Convenience hook: returns the running job for a ticker, or undefined. */
export function useJobForTicker(ticker: string): Job | undefined {
  const { getJobForTicker } = useJobs();
  return getJobForTicker(ticker);
}

export default function JobsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [capacityError, setCapacityError] = useState<CapacityError | null>(null);
  const [completionQueue, setCompletionQueue] = useState<CompletionEntry[]>([]);

  // Track which job ids we've already shown a completion modal for (this tab),
  // so we don't re-show on navigation/remount.
  const acknowledgedRef = useRef<Set<string>>(new Set());
  // Track jobs we're "owners of" (started or adopted in this tab) — only those
  // trigger a completion modal here.
  const ownedRef = useRef<Set<string>>(new Set());

  const upsertJob = useCallback((job: Job) => {
    setJobs((prev) => ({ ...prev, [job.id]: job }));
  }, []);

  const fetchJob = useCallback(
    async (jobId: string): Promise<Job | null> => {
      try {
        const res = await fetch(`/api/schedules/run?jobId=${jobId}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        return (await res.json()) as Job;
      } catch {
        return null;
      }
    },
    []
  );

  // ── On mount: adopt any running jobs the server already has. ────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/schedules/run", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const list = (await res.json()) as Job[];
        for (const j of list) {
          if (j.status === "running") {
            ownedRef.current.add(j.id);
            upsertJob(j);
          }
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [upsertJob]);

  // ── Poll all running jobs we know about. ────────────────────────────────
  useEffect(() => {
    const runningIds = Object.values(jobs)
      .filter((j) => j.status === "running")
      .map((j) => j.id);
    if (runningIds.length === 0) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      // Resolve all polls in parallel — with up to MAX_CONCURRENT jobs this
      // keeps the tick latency bounded.
      const results = await Promise.all(runningIds.map(fetchJob));
      if (cancelled) return;

      for (const fresh of results) {
        if (!fresh) continue;
        upsertJob(fresh);

        if (fresh.status !== "running" && ownedRef.current.has(fresh.id)) {
          if (fresh.status === "cancelled") {
            acknowledgedRef.current.add(fresh.id);
            ownedRef.current.delete(fresh.id);
            continue;
          }
          if (acknowledgedRef.current.has(fresh.id)) continue;

          let slug: string | null = null;
          if (fresh.status === "success") {
            try {
              const r = await fetch("/api/reports", { cache: "no-store" });
              if (r.ok) {
                const reportList = (await r.json()) as Array<{
                  ticker: string;
                  slug: string;
                }>;
                slug =
                  reportList.find(
                    (x) =>
                      x.ticker.toUpperCase() === fresh.ticker.toUpperCase()
                  )?.slug ?? null;
              }
            } catch {
              // ignore
            }
            router.refresh();
          }
          acknowledgedRef.current.add(fresh.id);
          ownedRef.current.delete(fresh.id);
          setCompletionQueue((q) => [...q, { job: fresh, slug }]);
        }
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobs, fetchJob, upsertJob, router]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const activeJobs = useMemo(
    () =>
      Object.values(jobs)
        .filter((j) => j.status === "running")
        .sort((a, b) => a.startedAt - b.startedAt),
    [jobs]
  );

  const startJob = useCallback(
    async (ticker: string, opts?: StartJobOptions): Promise<Job | null> => {
      const normalized = ticker.trim().toUpperCase();
      if (!normalized) return null;
      const sendEmail = opts?.sendEmail ?? false;

      // If the same ticker is already running here, just return that job.
      const existingForTicker = Object.values(jobs).find(
        (j) =>
          j.status === "running" &&
          j.ticker.toUpperCase() === normalized
      );
      if (existingForTicker) {
        ownedRef.current.add(existingForTicker.id);
        return existingForTicker;
      }

      const res = await fetch("/api/schedules/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalized, sendEmail }),
      });

      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as
          | (CapacityError & { error?: string })
          | null;
        if (body && body.error === "concurrency_limit") {
          setCapacityError({
            limit: body.limit,
            running: body.running ?? [],
            attempted: body.attempted ?? normalized,
          });
        }
        return null;
      }

      if (!res.ok) {
        throw new Error((await res.text()) || `HTTP ${res.status}`);
      }

      const { jobId } = (await res.json()) as { jobId: string };
      const fresh = await fetchJob(jobId);
      if (fresh) {
        ownedRef.current.add(fresh.id);
        upsertJob(fresh);
      }
      return fresh;
    },
    [jobs, fetchJob, upsertJob]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      const job = jobs[jobId];
      if (!job) return;
      try {
        await fetch(`/api/schedules/run?jobId=${jobId}`, { method: "DELETE" });
      } catch {
        // best-effort
      }
      upsertJob({
        ...job,
        status: "cancelled",
        finishedAt: Date.now(),
        error: "Cancelled by user",
      });
      acknowledgedRef.current.add(jobId);
      ownedRef.current.delete(jobId);
    },
    [jobs, upsertJob]
  );

  // ── Modal callbacks ──────────────────────────────────────────────────────
  const dismissCapacityError = useCallback(() => setCapacityError(null), []);
  const dismissCompletion = useCallback(() => {
    setCompletionQueue((q) => q.slice(1));
  }, []);

  const value = useMemo<JobsContextValue>(
    () => ({
      jobs,
      activeJobs,
      getJobForTicker: (ticker) =>
        Object.values(jobs).find(
          (j) =>
            j.ticker.toUpperCase() === ticker.toUpperCase() &&
            j.status === "running"
        ),
      isRunningFor: (ticker) =>
        !!Object.values(jobs).find(
          (j) =>
            j.ticker.toUpperCase() === ticker.toUpperCase() &&
            j.status === "running"
        ),
      startJob,
      cancelJob,
    }),
    [jobs, activeJobs, startJob, cancelJob]
  );

  const currentCompletion = completionQueue[0] ?? null;

  return (
    <JobsContext.Provider value={value}>
      {children}
      <JobIndicator activeJobs={activeJobs} onCancel={cancelJob} />
      <JobModals
        capacityError={capacityError}
        onDismissCapacityError={dismissCapacityError}
        completion={currentCompletion}
        onDismissCompletion={dismissCompletion}
      />
    </JobsContext.Provider>
  );
}
