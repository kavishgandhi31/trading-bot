import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const filePath = path.join(REPORTS_DIR, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  return NextResponse.json(data);
}
