import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");
const ARCHIVE_DIR = path.join(REPORTS_DIR, "archive");

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!/^[A-Z0-9._-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const filePath = path.join(REPORTS_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.renameSync(filePath, path.join(ARCHIVE_DIR, `${slug}.json`));
  return NextResponse.json({ ok: true });
}
