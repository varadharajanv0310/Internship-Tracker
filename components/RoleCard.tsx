"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";
import { useRoleState } from "./StateProvider";

const ODDS_STYLE: Record<Role["odds"], string> = {
  Strong: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  Moderate: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  Reach: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
};

const BUCKET_STYLE: Record<Role["locationBucket"], string> = {
  Chennai: "text-sky-300",
  Remote: "text-violet-300",
  Other: "text-zinc-400",
};

export function daysUntil(iso: string): number {
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  const now = Date.now();
  return Math.ceil((then - now) / 86_400_000);
}

export function RoleCard({ role }: { role: Role }) {
  const { state, toggleBookmark, toggleApplied } = useRoleState();
  const [showWhy, setShowWhy] = useState(false);

  const entry = state[role.id] ?? {};
  const applied = Boolean(entry.applied);
  const bookmarked = Boolean(entry.bookmarked);
  const dLeft = role.deadline ? daysUntil(role.deadline) : null;

  return (
    <article
      className={`group relative rounded-xl border p-4 transition ${
        applied
          ? "border-white/5 bg-white/[0.015] opacity-55 hover:opacity-90"
          : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {role.isNew && (
          <span className="badge-new rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-rose-300 ring-1 ring-rose-400/40">
            🚨 OPENED — apply within 48h
          </span>
        )}
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${ODDS_STYLE[role.odds]}`}
          title={`Fit score ${role.oddsScore}/100`}
        >
          {role.odds}
        </span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-white/10">
          lead with · {role.leadWithTag}
        </span>
        {dLeft !== null && dLeft >= 0 && dLeft <= 14 && (
          <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-300 ring-1 ring-orange-400/40">
            ⏳ {dLeft === 0 ? "closes today" : `${dLeft}d left`}
          </span>
        )}
        {applied && (
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            ✅ Applied{entry.appliedAt ? ` · ${entry.appliedAt}` : ""}
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-zinc-100">
        {role.role}
      </h3>

      <p className="mt-1 text-sm text-zinc-400">
        <span className="font-medium text-zinc-200">{role.company}</span>
        <span className="mx-1.5 text-zinc-600">·</span>
        <span className={BUCKET_STYLE[role.locationBucket]}>{role.location}</span>
        {role.stipend && (
          <>
            <span className="mx-1.5 text-zinc-600">·</span>
            <span className="text-emerald-300/90">{role.stipend}</span>
          </>
        )}
      </p>

      <p className="mt-2 text-xs text-zinc-500">
        <span className="text-zinc-400">Headline:</span> {role.leadWith}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={role.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-[13px] font-semibold text-[#04121d] transition hover:bg-sky-400"
        >
          Apply →
        </a>

        <button
          type="button"
          onClick={() => toggleBookmark(role.id)}
          aria-pressed={bookmarked}
          className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1 transition ${
            bookmarked
              ? "bg-amber-400/15 text-amber-300 ring-amber-400/40"
              : "text-zinc-400 ring-white/10 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
        </button>

        <button
          type="button"
          onClick={() => toggleApplied(role.id)}
          aria-pressed={applied}
          className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1 transition ${
            applied
              ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40"
              : "text-zinc-400 ring-white/10 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          {applied ? "✅ Applied" : "Mark applied"}
        </button>

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="ml-auto text-[12px] text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
        >
          {showWhy ? "hide odds" : `why ${role.odds.toLowerCase()}?`}
        </button>
      </div>

      {showWhy && (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-zinc-400">
          {role.oddsReasons.map((reason) => (
            <li
              key={reason}
              className={reason.startsWith("+") ? "text-emerald-300/80" : "text-rose-300/80"}
            >
              {reason}
            </li>
          ))}
          <li className="pt-1 text-zinc-600">
            score {role.oddsScore}/100 · tier {role.tier} ({TIER_LABELS[role.tier]}) ·{" "}
            {role.sourceLabel}
            {role.postedAt ? ` · posted ${role.postedAt}` : ""}
          </li>
        </ul>
      )}
    </article>
  );
}
