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
      {/* Top nav */}
      <div className="bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            &larr; Dashboard
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-white font-bold">{report.ticker}</span>
          <span className="text-slate-500 text-sm">{date}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-6 px-6">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <ReportView report={report} date={date} />
        </div>
      </div>
    </div>
  );
}
