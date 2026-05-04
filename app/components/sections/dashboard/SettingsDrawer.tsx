"use client";

/**
 * Settings drawer — slides in from the right and holds the things the user
 * configures once and rarely touches: email recipients, portfolio context,
 * scheduled reports.
 *
 * Pulling these out of the dashboard's main scroll keeps the page focused on
 * "what should I look at today?" instead of feeling like a settings panel.
 *
 * Behavior:
 *   • Backdrop click closes
 *   • Escape closes
 *   • Body scroll locked while open
 */

import { useEffect } from "react";
import RecipientManager from "@/app/components/RecipientManager";
import PortfolioManager from "@/app/components/PortfolioManager";
import ScheduleManager from "@/app/components/ScheduleManager";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
        onClick={onClose}
      />
      <aside
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-slate-50 shadow-2xl flex flex-col animate-[slideInRight_220ms_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <DrawerHeader onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <Section
            title="Email recipients"
            description="Scheduled reports with email enabled go to every address in this list."
          >
            <RecipientManager />
          </Section>
          <Section
            title="Your portfolio"
            description="Optional. Holdings, sector caps, and concentration limits — used for the Portfolio Fit check on every report."
          >
            <PortfolioManager />
          </Section>
          <Section
            title="Scheduled reports"
            description="Run a report on a recurring schedule. Disable any time."
          >
            <ScheduleManager />
          </Section>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(24px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
      <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
        Settings
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close settings"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </header>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">
        {title}
      </h3>
      <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">
        {description}
      </p>
      {children}
    </section>
  );
}
