import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SCHEDULES_FILE = path.join(
  process.cwd(),
  "backend",
  "scheduler",
  "schedules.json"
);

function readSchedules(): Record<string, unknown>[] {
  if (!fs.existsSync(SCHEDULES_FILE)) return [];
  return JSON.parse(fs.readFileSync(SCHEDULES_FILE, "utf-8"));
}

function writeSchedules(schedules: Record<string, unknown>[]) {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const schedules = readSchedules();
  const idx = schedules.findIndex((s) => s.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const allowed = ["frequency", "preferred_time", "send_email", "enabled"];
  for (const key of allowed) {
    if (key in body) {
      schedules[idx][key] = body[key];
    }
  }

  writeSchedules(schedules);
  return NextResponse.json(schedules[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const schedules = readSchedules();
  const filtered = schedules.filter((s) => s.id !== id);

  if (filtered.length === schedules.length) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  writeSchedules(filtered);
  return NextResponse.json({ ok: true });
}
