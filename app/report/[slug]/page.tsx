/**
 * Report page — server component.
 *
 * Reads the report JSON from disk and hands it to <ReportView /> for the
 * actual layout. Keeps a slim top nav with the back link and ticker; the
 * real verdict context lives in the sticky bar that ReportView renders
 * (which fades in on scroll past the hero).
 */

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
    <div className="min-h-screen bg-slate-50">
      {/* Slim top nav. The richer per-report context lives in the sticky
          bar inside <ReportView> that fades in on scroll. */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <span className="text-[13px] font-semibold tracking-tight">
              All reports
            </span>
          </Link>

          <div className="flex items-center gap-2.5 text-slate-500">
            <span className="text-[12px] font-mono tracking-tight">{date}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </span>
              <span className="text-[12.5px] font-semibold text-slate-700">
                Trading Bot
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto py-8 px-6">
        <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <ReportView report={report} date={date} slug={slug} />
        </article>
      </main>
    </div>
  );
}
