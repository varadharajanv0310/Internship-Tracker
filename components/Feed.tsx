"use client";

import { useMemo, useState } from "react";
import type { Role, Tier } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";
import { RoleCard, daysUntil } from "./RoleCard";
import { useRoleState } from "./StateProvider";

type StatusFilter = "All" | "New" | "Bookmarked" | "Applied";
type OddsFilter = "All" | "Strong" | "Moderate" | "Reach";
type LocFilter = "All" | "Chennai" | "Remote" | "Other";

const TIERS: Tier[] = [1, 2, 3, 4, 5, 6];

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${
        active
          ? "bg-sky-500/15 text-sky-200 ring-sky-400/40"
          : "text-zinc-400 ring-white/10 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export function Feed({
  roles,
  variant = "all",
  emptyMessage,
}: {
  roles: Role[];
  variant?: "all" | "bookmarks" | "applied";
  emptyMessage?: string;
}) {
  const { state, mode } = useRoleState();
  const [status, setStatus] = useState<StatusFilter>("All");
  const [odds, setOdds] = useState<OddsFilter>("All");
  const [loc, setLoc] = useState<LocFilter>("All");
  const [tiers, setTiers] = useState<Set<Tier>>(new Set());
  const [query, setQuery] = useState("");

  const scoped = useMemo(() => {
    if (variant === "bookmarks") return roles.filter((r) => state[r.id]?.bookmarked);
    if (variant === "applied") return roles.filter((r) => state[r.id]?.applied);
    return roles;
  }, [roles, state, variant]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((r) => {
      if (odds !== "All" && r.odds !== odds) return false;
      if (loc !== "All" && r.locationBucket !== loc) return false;
      if (tiers.size > 0 && !tiers.has(r.tier)) return false;
      if (status === "New" && !r.isNew) return false;
      if (status === "Bookmarked" && !state[r.id]?.bookmarked) return false;
      if (status === "Applied" && !state[r.id]?.applied) return false;
      if (q) {
        const hay = `${r.company} ${r.role} ${r.location} ${r.leadWithTag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scoped, odds, loc, tiers, status, query, state]);

  const deadlineSoon = useMemo(
    () =>
      scoped
        .filter((r) => {
          if (!r.deadline) return false;
          const d = daysUntil(r.deadline);
          return d >= 0 && d <= 14;
        })
        .sort((a, b) => daysUntil(a.deadline!) - daysUntil(b.deadline!)),
    [scoped],
  );

  const toggleTier = (t: Tier) =>
    setTiers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const appliedCount = scoped.filter((r) => state[r.id]?.applied).length;
  const bookmarkCount = scoped.filter((r) => state[r.id]?.bookmarked).length;

  return (
    <div className="space-y-5">
      {deadlineSoon.length > 0 && (
        <section className="rounded-xl border border-orange-400/25 bg-orange-500/[0.07] p-4">
          <h2 className="text-sm font-semibold text-orange-200">
            ⏳ Closing within 14 days
          </h2>
          <ul className="mt-2 space-y-1.5">
            {deadlineSoon.slice(0, 6).map((r) => {
              const d = daysUntil(r.deadline!);
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-orange-300">
                    {d === 0 ? "today" : `${d}d`}
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-200 underline-offset-2 hover:underline"
                  >
                    {r.company} — {r.role}
                  </a>
                  <span className="text-xs text-zinc-500">{r.location}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role, location…"
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-sky-400/50"
          />
          <span className="text-xs text-zinc-500">
            {filtered.length} of {scoped.length}
            {mode === "local" && (
              <span className="ml-2 text-zinc-600" title="Add a KV store to sync across devices">
                · saved in this browser
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-zinc-600">Status</span>
          {(["All", "New", "Bookmarked", "Applied"] as StatusFilter[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
              {s === "Bookmarked" && bookmarkCount > 0 && ` (${bookmarkCount})`}
              {s === "Applied" && appliedCount > 0 && ` (${appliedCount})`}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-zinc-600">Odds</span>
          {(["All", "Strong", "Moderate", "Reach"] as OddsFilter[]).map((o) => (
            <Chip key={o} active={odds === o} onClick={() => setOdds(o)}>
              {o}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-zinc-600">Location</span>
          {(["All", "Chennai", "Remote", "Other"] as LocFilter[]).map((l) => (
            <Chip key={l} active={loc === l} onClick={() => setLoc(l)}>
              {l}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-zinc-600">Source</span>
          {TIERS.map((t) => (
            <Chip
              key={t}
              active={tiers.has(t)}
              onClick={() => toggleTier(t)}
              title={TIER_LABELS[t]}
            >
              T{t}
            </Chip>
          ))}
          {tiers.size > 0 && (
            <button
              type="button"
              onClick={() => setTiers(new Set())}
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              clear
            </button>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
          {emptyMessage ?? "Nothing matches these filters."}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
