"use client";

import { useState } from "react";

type Status = "idle" | "running" | "queued" | "error";

export function ScanButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<string>("");

  async function run() {
    setStatus("running");
    setDetail("");
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; message: string };
      if (data.ok) {
        setStatus("queued");
        setDetail(data.message);
      } else {
        setStatus("error");
        setDetail(data.message);
      }
    } catch (err) {
      setStatus("error");
      setDetail(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={run}
        disabled={status === "running"}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
      >
        {status === "running" ? "Triggering…" : "Run scan now"}
      </button>

      {(status === "queued" || status === "error") && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border p-3 text-xs shadow-xl ${
            status === "queued"
              ? "border-emerald-400/30 bg-[#0d1a14] text-emerald-200"
              : "border-rose-400/30 bg-[#1a0d10] text-rose-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="leading-relaxed">{detail}</p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
