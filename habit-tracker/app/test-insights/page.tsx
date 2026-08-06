"use client";

import { useState } from "react";

export default function TestInsightsPage() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Say something about my consistency over 30 days.",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setText(data.text);
      } else {
        setText(`Error: ${data.error ?? "Unknown"}`);
      }
    } catch (err: any) {
      setText(`Error: ${err?.message ?? "Request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <button
        onClick={handleClick}
        className="px-4 py-2 rounded bg-emerald-600 text-white"
      >
        {loading ? "Thinking..." : "Test Gemini insights"}
      </button>

      {text && (
        <div className="mt-4 border rounded p-3 whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}