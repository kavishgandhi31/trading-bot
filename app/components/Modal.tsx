"use client";

import { useEffect } from "react";

export type ModalAccent = "emerald" | "amber" | "red" | "slate";

const ACCENT_BAR: Record<ModalAccent, string> = {
  emerald: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600",
  amber: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500",
  red: "bg-gradient-to-r from-red-400 via-red-500 to-red-600",
  slate: "bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700",
};

const ICON_BG: Record<ModalAccent, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  amber: "bg-amber-50 text-amber-600 ring-amber-200",
  red: "bg-red-50 text-red-600 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

interface ModalProps {
  open: boolean;
  accent?: ModalAccent;
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    tone?: "primary" | "danger" | "success";
    href?: string;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  dismissOnBackdrop?: boolean;
}

const TONE_CLASSES: Record<NonNullable<NonNullable<ModalProps["primaryAction"]>["tone"]>, string> = {
  primary: "bg-slate-900 hover:bg-slate-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

export default function Modal({
  open,
  accent = "slate",
  icon,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onDismiss) onDismiss();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onDismiss]);

  if (!open) return null;

  const primaryTone = primaryAction?.tone ?? "primary";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
      onClick={() => {
        if (dismissOnBackdrop && onDismiss) onDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-[scaleIn_140ms_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1 ${ACCENT_BAR[accent]}`} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {icon && (
              <div
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1 ${ICON_BG[accent]}`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2
                id="modal-title"
                className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug"
              >
                {title}
              </h2>
              {description && (
                <div className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
          </div>

          {children && <div className="mt-4">{children}</div>}

          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex items-center justify-end gap-2">
              {secondaryAction && (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100"
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction &&
                (primaryAction.href ? (
                  <a
                    href={primaryAction.href}
                    onClick={() => primaryAction.onClick()}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg shadow-sm ${TONE_CLASSES[primaryTone]}`}
                  >
                    {primaryAction.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={primaryAction.disabled}
                    onClick={primaryAction.onClick}
                    className={`text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${TONE_CLASSES[primaryTone]}`}
                  >
                    {primaryAction.label}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
