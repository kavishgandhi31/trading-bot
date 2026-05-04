// Shared types for the report-generation job system. Mirrors the server-side
// shape in app/api/schedules/run/jobs.ts so client and server agree without
// either depending on the other.

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

export interface StartJobOptions {
  sendEmail?: boolean;
}

/** Server response shape when a start request is rejected for hitting the cap. */
export interface CapacityError {
  limit: number;
  running: string[];
  attempted: string;
}
