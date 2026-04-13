import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

export async function GET() {
  return NextResponse.json(readSchedules());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { ticker, frequency, preferred_time, send_email } = body;

  if (!ticker || !frequency) {
    return NextResponse.json(
      { error: "ticker and frequency are required" },
      { status: 400 }
    );
  }

  const validFrequencies = ["daily", "weekly", "biweekly", "monthly"];
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json(
      { error: `frequency must be one of: ${validFrequencies.join(", ")}` },
      { status: 400 }
    );
  }

  const schedules = readSchedules();
  const exists = schedules.some(
    (s) => (s.ticker as string).toUpperCase() === ticker.toUpperCase()
  );
  if (exists) {
    return NextResponse.json(
      { error: `Schedule for ${ticker.toUpperCase()} already exists` },
      { status: 409 }
    );
  }

  const schedule = {
    id: randomUUID().slice(0, 8),
    ticker: ticker.toUpperCase(),
    frequency,
    preferred_time: preferred_time || "09:00",
    send_email: send_email ?? true,
    enabled: true,
    last_run: null,
    created_at: new Date().toISOString(),
  };

  schedules.push(schedule);
  writeSchedules(schedules);

  return NextResponse.json(schedule, { status: 201 });
}
