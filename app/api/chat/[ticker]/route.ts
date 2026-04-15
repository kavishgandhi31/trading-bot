import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });

const CHAT_DIR = path.join(process.cwd(), "backend", "chat");
const REPORTS_DIR = path.join(process.cwd(), "backend", "reports");

const MODEL = "claude-sonnet-4-6";

type Attachment =
  | { type: "pdf"; filename: string; data: string }
  | { type: "text"; filename?: string; text: string };

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{ type: "pdf" | "text"; filename?: string }>;
  attachmentBlocks?: Array<Record<string, unknown>>;
  timestamp: string;
}

interface ChatFile {
  ticker: string;
  messages: StoredMessage[];
  last_updated: string;
}

function chatFilePath(ticker: string): string {
  return path.join(CHAT_DIR, `${ticker.toUpperCase()}_chat.json`);
}

function loadChat(ticker: string): ChatFile {
  const filePath = chatFilePath(ticker);
  if (!fs.existsSync(filePath)) {
    return { ticker: ticker.toUpperCase(), messages: [], last_updated: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveChat(chat: ChatFile) {
  if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });
  chat.last_updated = new Date().toISOString();
  fs.writeFileSync(chatFilePath(chat.ticker), JSON.stringify(chat, null, 2));
}

function findLatestReport(ticker: string): Record<string, unknown> | null {
  if (!fs.existsSync(REPORTS_DIR)) return null;
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.toUpperCase().startsWith(`${ticker.toUpperCase()}_`) && f.endsWith(".json"))
    .sort()
    .reverse();
  if (!files.length) return null;
  const raw = fs.readFileSync(path.join(REPORTS_DIR, files[0]), "utf-8");
  return JSON.parse(raw);
}

function buildSystemPrompt(ticker: string, report: Record<string, unknown> | null): string {
  const reportJson = report ? JSON.stringify(report, null, 2) : "No prior research report available.";
  return `You are a sharp, opinionated stock research analyst helping the user debate and pressure-test an investment thesis on ${ticker.toUpperCase()}.

You have access to a prior deep research report that you previously generated. Treat it as your baseline knowledge — reference it, but update your view when new information contradicts it. Cite specific sections of the report when relevant.

Rules of engagement:
- Be direct and opinionated. Do not hedge.
- When the user pushes back on a risk, either concede or explain precisely why the counter-argument does not fully address it.
- When new information is provided (articles, filings, headlines), explicitly state: (1) what the source gets right, (2) what it misses or glosses over, (3) whether this strengthens or weakens the bull/bear case.
- Use the web_search tool to pull fresh data when the user asks about prices, recent news, filings, competitor moves, or anything time-sensitive. Do not hallucinate current numbers.
- When asked for a verdict, give one: bull case, bear case, net view, and what would change your mind.
- Be brutally honest. If the user is glossing over a risk, call it out.

=== PRIOR RESEARCH REPORT ===
${reportJson}
=== END REPORT ===`;
}

function toApiMessages(
  stored: StoredMessage[],
  newUserText: string,
  newAttachments: Attachment[]
): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = stored.map((m) => {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (m.attachmentBlocks) {
      for (const b of m.attachmentBlocks) {
        blocks.push(b as unknown as Anthropic.ContentBlockParam);
      }
    }
    if (m.content) blocks.push({ type: "text", text: m.content });
    return { role: m.role, content: blocks.length ? blocks : m.content };
  });

  const newBlocks: Anthropic.ContentBlockParam[] = [];
  for (const a of newAttachments) {
    if (a.type === "pdf") {
      newBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: a.data },
        title: a.filename,
      });
    } else {
      newBlocks.push({
        type: "document",
        source: { type: "text", media_type: "text/plain", data: a.text },
        title: a.filename ?? "Pasted text",
      });
    }
  }
  if (newUserText) newBlocks.push({ type: "text", text: newUserText });

  msgs.push({ role: "user", content: newBlocks.length ? newBlocks : newUserText });
  return msgs;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const chat = loadChat(ticker);
  const safeMessages = chat.messages.map((m) => ({
    role: m.role,
    content: m.content,
    attachments: m.attachments ?? [],
    timestamp: m.timestamp,
  }));
  return NextResponse.json({ ticker: chat.ticker, messages: safeMessages });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const filePath = chatFilePath(ticker);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const body = await req.json();
  const message: string = body.message ?? "";
  const attachments: Attachment[] = body.attachments ?? [];

  if (!message && attachments.length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const chat = loadChat(ticker);
  const report = findLatestReport(ticker);
  const system = buildSystemPrompt(ticker, report);
  const apiMessages = toApiMessages(chat.messages, message, attachments);

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let assistantText = "";
      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 5,
            } as unknown as Anthropic.Tool,
          ],
          messages: apiMessages,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              assistantText += event.delta.text;
              send("delta", { text: event.delta.text });
            }
          } else if (event.type === "content_block_start") {
            if (event.content_block.type === "server_tool_use" && event.content_block.name === "web_search") {
              send("tool_use", { name: "web_search" });
            }
          } else if (event.type === "message_stop") {
            send("done", {});
          }
        }

        // Persist
        const now = new Date().toISOString();
        const userStored: StoredMessage = {
          role: "user",
          content: message,
          timestamp: now,
          attachments: attachments.map((a) => ({
            type: a.type,
            filename: a.type === "pdf" ? a.filename : a.filename,
          })),
          attachmentBlocks: attachments.map((a) =>
            a.type === "pdf"
              ? {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: a.data },
                  title: a.filename,
                }
              : {
                  type: "document",
                  source: { type: "text", media_type: "text/plain", data: a.text },
                  title: a.filename ?? "Pasted text",
                }
          ),
        };
        const assistantStored: StoredMessage = {
          role: "assistant",
          content: assistantText,
          timestamp: new Date().toISOString(),
        };
        chat.messages.push(userStored, assistantStored);
        saveChat(chat);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send("error", { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
