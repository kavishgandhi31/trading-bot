"use client";

import { useState, useEffect, useCallback } from "react";

export default function RecipientManager() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRecipients = useCallback(async () => {
    const res = await fetch("/api/recipients");
    setRecipients(await res.json());
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  async function addRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add email");
    } else {
      setEmail("");
    }

    setLoading(false);
    fetchRecipients();
  }

  async function removeRecipient(email: string) {
    await fetch("/api/recipients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    fetchRecipients();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={addRecipient} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      {recipients.length === 0 ? (
        <p className="text-sm text-slate-400">
          No recipients yet. Reports will not be emailed until at least one is added.
        </p>
      ) : (
        <div className="space-y-2">
          {recipients.map((r) => (
            <div
              key={r}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5"
            >
              <span className="text-sm text-slate-700">{r}</span>
              <button
                onClick={() => removeRecipient(r)}
                className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer text-lg leading-none ml-4"
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
