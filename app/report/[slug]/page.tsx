import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReportView from "./ReportView";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filePath = path.join(REPORTS_DIR, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const report = JSON.parse(raw);
  const dateMatch = slug.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? "";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top app nav */}
      <header className="relative bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden">
        {/* Soft emerald glow */}
        <div
          aria-hidden
          className="absolute -top-20 -left-12 w-64 h-64 rounded-full opacity-[0.16]"
          style={{ background: "radial-gradient(circle, #059669 0%, transparent 60%)" }}
        />
        {/* Subtle grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand + back link (logo click = back) */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500 group-hover:text-white transition-colors"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center ring-1 ring-emerald-400/20 shadow shadow-emerald-950/50">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-bold tracking-tight">Trading Bot</span>
              <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-emerald-300/80">
                Research
              </span>
            </div>
          </Link>

          {/* Report context */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-white tracking-tight font-mono">
              {report.ticker}
            </span>
            <span className="w-px h-4 bg-slate-700" />
            <span className="text-[11.5px] text-slate-400 font-mono tracking-wide">
              {date}
            </span>
          </div>
        </div>

        {/* Accent line */}
        <div
          aria-hidden
          className="relative h-px bg-gradient-to-r from-transparent via-emerald-600/50 to-transparent"
        />
      </header>

      <div className="max-w-3xl mx-auto py-6 px-6">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <ReportView report={report} date={date} />
        </div>
      </div>
    </div>
  );
}
