"use client";

import { useRouter } from "next/navigation";
import Modal from "@/app/components/Modal";
import type { CapacityError, Job } from "./types";

interface CompletionEntry {
  job: Job;
  slug: string | null;
}

interface Props {
  capacityError: CapacityError | null;
  onDismissCapacityError: () => void;
  completion: CompletionEntry | null;
  onDismissCompletion: () => void;
}

const CheckIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const AlertIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);

const QueueIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export default function JobModals({
  capacityError,
  onDismissCapacityError,
  completion,
  onDismissCompletion,
}: Props) {
  const router = useRouter();

  return (
    <>
      <Modal
        open={!!capacityError}
        accent="red"
        icon={QueueIcon}
        title="Generation limit reached"
        description={
          capacityError ? (
            <>
              You can only generate{" "}
              <span className="font-semibold text-slate-900">
                {capacityError.limit}
              </span>{" "}
              reports at a time. Wait for one to finish before starting{" "}
              <span className="font-semibold text-slate-900 font-mono">
                {capacityError.attempted}
              </span>
              .
            </>
          ) : null
        }
        onDismiss={onDismissCapacityError}
        primaryAction={{
          label: "OK",
          tone: "primary",
          onClick: onDismissCapacityError,
        }}
      >
        {capacityError && capacityError.running.length > 0 && (
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400 mb-2">
              Currently generating
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capacityError.running.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold px-2.5 py-1 rounded-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!completion && completion.job.status === "success"}
        accent="emerald"
        icon={CheckIcon}
        title={
          completion ? `${completion.job.ticker} report is ready` : "Ready"
        }
        description={
          <>
            The 7-stage research pipeline finished. Open the report to review
            the verdict, trade setup, and full deep dive — or head back to the
            dashboard to see it in your list.
          </>
        }
        onDismiss={onDismissCompletion}
        secondaryAction={{
          label: "Dismiss",
          onClick: onDismissCompletion,
        }}
        primaryAction={
          completion?.slug
            ? {
                label: "View report",
                tone: "success",
                onClick: () => {
                  onDismissCompletion();
                  router.push(`/report/${completion.slug}`);
                },
              }
            : {
                label: "Go to dashboard",
                tone: "success",
                onClick: () => {
                  onDismissCompletion();
                  router.push("/");
                },
              }
        }
      />

      <Modal
        open={!!completion && completion.job.status === "failed"}
        accent="red"
        icon={AlertIcon}
        title={
          completion
            ? `${completion.job.ticker} generation failed`
            : "Generation failed"
        }
        description={
          completion?.job.error ? (
            <span className="block">
              <span className="block text-slate-600 mb-2">
                The pipeline reported an error. You can try again from the
                dashboard.
              </span>
              <code className="block bg-red-50 border border-red-100 text-red-700 text-[12px] rounded-md px-2.5 py-1.5 font-mono break-words">
                {completion.job.error}
              </code>
            </span>
          ) : (
            "The pipeline did not finish successfully."
          )
        }
        onDismiss={onDismissCompletion}
        primaryAction={{
          label: "OK",
          onClick: onDismissCompletion,
          tone: "primary",
        }}
      />
    </>
  );
}
