import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "backend", "config.json");

function readConfig(): { recipients: string[] } {
  if (!fs.existsSync(CONFIG_FILE)) return { recipients: [] };
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
}

function writeConfig(data: { recipients: string[] }) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(readConfig().recipients);
}

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const config = readConfig();
  if (config.recipients.includes(email.toLowerCase())) {
    return NextResponse.json({ error: "Email already in list" }, { status: 409 });
  }

  config.recipients.push(email.toLowerCase());
  writeConfig(config);
  return NextResponse.json(config.recipients, { status: 201 });
}

export async function DELETE(request: Request) {
  const { email } = await request.json();
  const config = readConfig();
  config.recipients = config.recipients.filter((r) => r !== email);
  writeConfig(config);
  return NextResponse.json(config.recipients);
}
