import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PLIST_NAME = "com.tradingbot.scheduler";
const PLIST_SRC = path.join(
  process.cwd(),
  "backend",
  "scheduler",
  `${PLIST_NAME}.plist`
);
const PLIST_DEST = path.join(
  process.env.HOME || "",
  "Library",
  "LaunchAgents",
  `${PLIST_NAME}.plist`
);
const LOG_FILE = path.join(
  process.cwd(),
  "backend",
  "scheduler",
  "scheduler.log"
);

function isRunning(): boolean {
  try {
    const out = execSync("launchctl list", { encoding: "utf-8" });
    return out.includes(PLIST_NAME);
  } catch {
    return false;
  }
}

function tailLog(lines: number = 20): string {
  if (!fs.existsSync(LOG_FILE)) return "";
  try {
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    return content.split("\n").slice(-lines).join("\n").trim();
  } catch {
    return "";
  }
}

export async function GET() {
  return NextResponse.json({
    running: isRunning(),
    log: tailLog(),
  });
}

export async function POST(request: Request) {
  const { action } = await request.json();

  if (action === "start") {
    try {
      fs.copyFileSync(PLIST_SRC, PLIST_DEST);
      execSync(`launchctl load "${PLIST_DEST}"`);
      return NextResponse.json({ running: true });
    } catch (e) {
      return NextResponse.json(
        { error: String(e), running: false },
        { status: 500 }
      );
    }
  }

  if (action === "stop") {
    try {
      execSync(`launchctl unload "${PLIST_DEST}" 2>/dev/null || true`);
      if (fs.existsSync(PLIST_DEST)) fs.unlinkSync(PLIST_DEST);
      return NextResponse.json({ running: false });
    } catch (e) {
      return NextResponse.json(
        { error: String(e), running: isRunning() },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
