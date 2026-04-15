"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AttachmentMeta = { type: "pdf" | "text"; filename?: string };

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: AttachmentMeta[];
  timestamp?: string;
  streaming?: boolean;
  toolUses?: number;
}

type PendingAttachment =
  | { type: "pdf"; filename: string; data: string }
  | { type: "text"; filename?: string; text: string };

const QUICK_PROMPTS: { label: string; hint: string; text: string }[] = [
  {
    label: "Give me your verdict",
    hint: "Bull case, bear case, net view.",
    text: "Based on everything in this thread, give me your honest assessment of {TICKER}. Bull case, bear case, and your net view. Be direct. What would change your mind?",
  },
  {
    label: "Asymmetry check",
    hint: "Downside floor vs upside ceiling.",
    text: "Analyze the asymmetry of {TICKER}. Low valuation floor based on historical multiples vs high growth ceiling? Where is the downside and what does the upside require to play out?",
  },
  {
    label: "Write the short report",
    hint: "Bear thesis in 3 points.",
    text: "Search Seeking Alpha bear articles and Twitter/X for negative threads on {TICKER}. Act as a short seller and write a 3-point Short Report. What is the bear thesis?",
  },
  {
    label: "Push back on a risk",
    hint: "Debate a specific concern.",
    text: "You flagged [RISK] as the key concern. My counter-argument: [YOUR ARGUMENT]. Does this change how you weight that risk?",
  },
  {
    label: "Incorporate new info",
    hint: "Feed a headline or earnings note.",
    text: "New information: [PASTE HEADLINE OR EARNINGS UPDATE]. How does this change the thesis? Does it strengthen the bull case, address a known risk, or create a new concern?",
  },
  {
    label: "Analyze an article",
    hint: "Paste or attach a bull/bear piece.",
    text: "I am sharing an article on {TICKER}. Tell me: (1) What does the author get right? (2) What are they missing or glossing over? (3) Does this change your view from our earlier discussion?",
  },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
        You
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-md bg-emerald-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
      ✦
    </div>
  );
}

function ToolUsePill({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 mb-2">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      Searched the web{count > 1 ? ` (${count})` : ""}
    </div>
  );
}

function MessageContent({ content, isAssistant }: { content: string; isAssistant: boolean }) {
  if (!isAssistant) {
    return (
      <div className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
        {content}
      </div>
    );
  }
  return (
    <div className="text-[15px] leading-relaxed text-slate-800 prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 last:mb-0 pl-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 last:mb-0 pl-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-bold text-slate-900 mt-4 mb-2">{children}</h3>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5">{children}</h3>,
          code: ({ children, ...props }) => {
            const inline = !("className" in props && props.className);
            return inline ? (
              <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[13px] font-mono">{children}</code>
            ) : (
              <code className="block p-3 rounded bg-slate-900 text-slate-100 text-[13px] font-mono overflow-x-auto">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-300 pl-3 my-3 text-slate-600">{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="text-sm border-collapse border border-slate-200">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-50 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
          hr: () => <hr className="my-4 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatPanel({
  ticker,
  onClose,
}: {
  ticker: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [regenStatus, setRegenStatus] = useState<"idle" | "running" | "success" | "failed">("idle");
  const [regenLogTail, setRegenLogTail] = useState("");
  const [regenError, setRegenError] = useState<string | null>(null);
  const [userAtBottom, setUserAtBottom] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/chat/${ticker}`);
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      setMessages(data.messages ?? []);
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Smart auto-scroll: only follow the bottom if the user is already near it.
  useEffect(() => {
    if (!userAtBottom) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, userAtBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setUserAtBottom(atBottom);
  }

  function jumpToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUserAtBottom(true);
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text && pending.length === 0) return;
    if (sending) return;

    const outgoingAttachments = pending.slice();
    const userMsg: Message = {
      role: "user",
      content: text,
      attachments: outgoingAttachments.map((a) => ({
        type: a.type,
        filename: a.filename,
      })),
    };
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true, toolUses: 0 };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setPending([]);
    setSending(true);
    setUserAtBottom(true);

    try {
      const res = await fetch(`/api/chat/${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, attachments: outgoingAttachments }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const chunk of events) {
          if (!chunk.trim()) continue;
          const lines = chunk.split("\n");
          let eventName = "message";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }

          if (eventName === "delta") {
            const piece = (payload.text as string) ?? "";
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + piece };
              }
              return copy;
            });
          } else if (eventName === "tool_use") {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, toolUses: (last.toolUses ?? 0) + 1 };
              }
              return copy;
            });
          } else if (eventName === "error") {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + `\n\n[Error: ${payload.message as string}]`,
                  streaming: false,
                };
              }
              return copy;
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: `[Error: ${msg}]`, streaming: false };
        }
        return copy;
      });
    } finally {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, streaming: false };
        return copy;
      });
      setSending(false);
    }
  }

  async function handleFileChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported.");
      return;
    }
    const data = await fileToBase64(file);
    setPending((prev) => [...prev, { type: "pdf", filename: file.name, data }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAddPastedText() {
    if (!pasteText.trim()) return;
    setPending((prev) => [
      ...prev,
      { type: "text", filename: pasteTitle.trim() || "Pasted text", text: pasteText },
    ]);
    setPasteTitle("");
    setPasteText("");
    setPasteModalOpen(false);
  }

  async function handleClear() {
    if (!confirm(`Clear chat history for ${ticker}?`)) return;
    await fetch(`/api/chat/${ticker}`, { method: "DELETE" });
    setMessages([]);
  }

  async function handleCopy(content: string, idx: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      // ignore
    }
  }

  async function handleRegenerate() {
    if (regenStatus === "running") return;
    if (!confirm(`Regenerate research report for ${ticker}? This takes 3–8 minutes. The chat will use the new report for future turns.`)) return;

    setRegenStatus("running");
    setRegenError(null);
    setRegenLogTail("Starting pipeline…");

    try {
      const startRes = await fetch(`/api/schedules/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!startRes.ok) throw new Error(`Failed to start: ${await startRes.text()}`);
      const { jobId } = (await startRes.json()) as { jobId: string };

      while (true) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await fetch(`/api/schedules/run?jobId=${jobId}`);
        if (!pollRes.ok) throw new Error(`Poll failed: ${await pollRes.text()}`);
        const job = (await pollRes.json()) as {
          status: "running" | "success" | "failed";
          log: string;
          error: string | null;
        };
        const tail = job.log.split("\n").filter(Boolean).slice(-1)[0] ?? "";
        setRegenLogTail(tail);
        if (job.status === "success") {
          setRegenStatus("success");
          handleSend(
            `The research report for ${ticker} has just been regenerated. Using the new report as your baseline, give me your updated verdict: what changed vs your previous view, what strengthened, what weakened, and what is your net call now?`
          );
          return;
        }
        if (job.status === "failed") {
          setRegenStatus("failed");
          setRegenError(job.error ?? "Pipeline failed");
          return;
        }
      }
    } catch (err) {
      setRegenStatus("failed");
      setRegenError(err instanceof Error ? err.message : String(err));
    }
  }

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-white flex flex-col"
    : "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[520px] bg-white border-l border-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.12)] flex flex-col";

  const contentWrapper = fullscreen ? "max-w-3xl mx-auto w-full" : "w-full";

  return (
    <>
      <style jsx global>{`
        .chat-fade-in {
          animation: chatFadeIn 180ms ease-out;
        }
        @keyframes chatFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .chat-cursor::after {
          content: "";
          display: inline-block;
          width: 6px;
          height: 15px;
          background: #64748b;
          margin-left: 2px;
          vertical-align: -2px;
          animation: chatBlink 1s steps(2, start) infinite;
          border-radius: 1px;
        }
        @keyframes chatBlink {
          to {
            visibility: hidden;
          }
        }
      `}</style>

      <div className={containerClass}>
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              ✦
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-white leading-tight truncate">
                {ticker} research chat
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Claude Sonnet 4.6 · full report loaded
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRegenerate}
              disabled={regenStatus === "running"}
              className="text-[12px] text-slate-300 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed px-2.5 py-1.5 rounded hover:bg-slate-800 flex items-center gap-1.5"
              title="Regenerate research report"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              {regenStatus === "running" ? "Regenerating" : "Regenerate"}
            </button>
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
              title="Clear chat history"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6v6" />
                  <path d="M20 10h-6V4" />
                  <path d="M14 10l7-7" />
                  <path d="M10 14l-7 7" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Regeneration banner */}
        {regenStatus !== "idle" && (
          <div
            className={`px-5 py-2.5 border-b text-[13px] ${
              regenStatus === "running"
                ? "bg-blue-50 border-blue-100 text-blue-800"
                : regenStatus === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-red-50 border-red-100 text-red-800"
            }`}
          >
            {regenStatus === "running" && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Regenerating {ticker} report</span>
                {regenLogTail && <span className="text-blue-600 truncate">· {regenLogTail}</span>}
              </div>
            )}
            {regenStatus === "success" && (
              <div className="flex items-center justify-between gap-2">
                <span>✓ New {ticker} report is live. Asking Claude for an updated verdict…</span>
                <button onClick={() => setRegenStatus("idle")} className="text-emerald-600 hover:text-emerald-800 text-xs">
                  Dismiss
                </button>
              </div>
            )}
            {regenStatus === "failed" && (
              <div className="flex items-center justify-between gap-2">
                <span>✗ Regeneration failed: {regenError}</span>
                <button onClick={() => setRegenStatus("idle")} className="text-red-600 hover:text-red-800 text-xs">
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-slate-50/30"
        >
          <div className={`${contentWrapper} px-5 py-6`}>
            {messages.length === 0 ? (
              <EmptyState ticker={ticker} onPick={(t) => handleSend(t)} />
            ) : (
              messages.map((m, i) => (
                <div key={i} className="chat-fade-in mb-7 group">
                  <div className="flex items-start gap-3">
                    <Avatar role={m.role} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-slate-900">
                          {m.role === "user" ? "You" : "Claude"}
                        </span>
                        {m.role === "assistant" && m.content && !m.streaming && (
                          <button
                            onClick={() => handleCopy(m.content, i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                            title="Copy"
                          >
                            {copiedIdx === i ? (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Copied
                              </>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {m.attachments.map((a, ai) => (
                            <span
                              key={ai}
                              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600"
                            >
                              {a.type === "pdf" ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                  <rect x="8" y="2" width="8" height="4" rx="1" />
                                </svg>
                              )}
                              {a.filename ?? (a.type === "pdf" ? "PDF" : "Text")}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.role === "assistant" && (m.toolUses ?? 0) > 0 && (
                        <ToolUsePill count={m.toolUses ?? 0} />
                      )}
                      {m.content || !m.streaming ? (
                        <div className={m.streaming ? "chat-cursor" : ""}>
                          <MessageContent content={m.content} isAssistant={m.role === "assistant"} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Jump-to-latest floating pill */}
        {!userAtBottom && messages.length > 0 && (
          <button
            onClick={jumpToBottom}
            className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Jump to latest
          </button>
        )}

        {/* Input area */}
        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <div className={contentWrapper}>
            {/* Quick prompts (when conversation in progress) */}
            {messages.length > 0 && (
              <div className="mb-2 -mx-1 overflow-x-auto">
                <div className="flex gap-1.5 px-1 pb-1">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setInput(p.text.replaceAll("{TICKER}", ticker))}
                      className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending attachments */}
            {pending.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pending.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800"
                  >
                    {a.type === "pdf" ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" />
                      </svg>
                    )}
                    <span className="truncate max-w-[200px]">{a.filename ?? "Pasted text"}</span>
                    <button
                      onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-emerald-600 hover:text-emerald-900 -mr-1 leading-none"
                      aria-label="Remove attachment"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Unified input container */}
            <div className="relative rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-slate-400 focus-within:shadow-md transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask, debate, push back on ${ticker}…`}
                rows={1}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
                disabled={sending}
              />
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <div className="flex items-center gap-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChoose}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded"
                    title="Attach PDF"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPasteModalOpen(true)}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded"
                    title="Paste article text"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" />
                      <path d="M8 12h8" />
                      <path d="M8 16h6" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={sending || (!input.trim() && pending.length === 0)}
                  className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
                  title="Send"
                >
                  {sending ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="6" y="6" width="12" height="12" rx="1.5" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5" />
                      <path d="M5 12l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="text-[10.5px] text-slate-400 text-center mt-1.5">
              Press <kbd className="font-mono text-slate-500">Enter</kbd> to send, <kbd className="font-mono text-slate-500">Shift+Enter</kbd> for new line
            </div>
          </div>
        </div>
      </div>

      {/* Paste modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setPasteModalOpen(false)}>
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Paste article</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Drop in a bull or bear piece for Claude to analyze.</p>
              </div>
              <button
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto">
              <input
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="Source or title (e.g. 'Seeking Alpha bear thesis, Mar 2026')"
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
              />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste article body here…"
                rows={14}
                className="flex-1 text-sm text-slate-900 border border-slate-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-slate-500"
              />
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPastedText}
                disabled={!pasteText.trim()}
                className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Attach
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState({ ticker, onPick }: { ticker: string; onPick: (text: string) => void }) {
  return (
    <div className="pt-6 pb-2">
      <div className="mb-1 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white text-2xl font-bold mb-4">
          ✦
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Debate the {ticker} thesis</h2>
        <p className="text-[13px] text-slate-500 max-w-sm mx-auto">
          Claude has your full research report loaded as context. Push back, ask for a verdict, or drop in an article.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.text.replaceAll("{TICKER}", ticker))}
            className="text-left rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all px-3.5 py-3 group"
          >
            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-slate-700">
              {p.label}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">{p.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
