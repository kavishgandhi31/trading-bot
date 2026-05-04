import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const TIMEOUT_MS = 60 * 1000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!/^[A-Z0-9._-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const cwd = process.cwd();
  const reportPath = path.join(cwd, "backend", "reports", `${slug}.json`);
  if (!fs.existsSync(reportPath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const python = path.join(cwd, "backend", "venv", "bin", "python3.12");
  const backend = path.join(cwd, "backend");

  return await new Promise<Response>((resolve) => {
    const proc = spawn(python, ["send_existing.py", slug], {
      cwd: backend,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let stdout = "";
    let stderr = "";

    const killTimer = setTimeout(() => {
      proc.kill();
      resolve(
        NextResponse.json({ error: "Email send timed out" }, { status: 504 })
      );
    }, TIMEOUT_MS);

    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    proc.on("close", (code: number) => {
      clearTimeout(killTimer);
      if (code === 0) {
        resolve(NextResponse.json({ ok: true, log: stdout }));
      } else {
        resolve(
          NextResponse.json(
            { error: (stderr || stdout || `Exit code ${code}`).trim() },
            { status: 500 }
          )
        );
      }
    });

    proc.on("error", (err: Error) => {
      clearTimeout(killTimer);
      resolve(NextResponse.json({ error: err.message }, { status: 500 }));
    });
  });
}
