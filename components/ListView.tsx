"use client";

import { useMemo } from "react";
import type { Role } from "@/lib/types";
import { TIER_SHORT, ageInDays, ageLabel, fmtDate, isLocal, oddsColor } from "@/lib/view";
import { useRoleState } from "./StateProvider";

export function ListView({ roles, variant }: { roles: Role[]; variant: "bookmarks" | "applied" }) {
  const { state, toggleApplied } = useRoleState();

  const rows = useMemo(() => {
    if (variant === "bookmarks") {
      return roles
        .filter((r) => state[r.id]?.bookmarked)
        .sort((a, b) => b.oddsScore - a.oddsScore);
    }
    return roles
      .filter((r) => state[r.id]?.applied)
      .sort((a, b) => (state[b.id]?.appliedAt ?? "").localeCompare(state[a.id]?.appliedAt ?? ""));
  }, [roles, state, variant]);

  const stats =
    variant === "bookmarks"
      ? [
          { value: rows.length, label: "Starred", color: "var(--fg)" },
          {
            value: rows.filter((r) => r.odds === "Strong").length,
            label: "Strong",
            color: "var(--acc-strong)",
          },
          {
            value: rows.filter((r) => !state[r.id]?.applied).length,
            label: "Not yet applied",
            color: "var(--fg)",
          },
        ]
      : [
          { value: rows.length, label: "Applications", color: "var(--fg)" },
          {
            value: rows.filter((r) => {
              const d = state[r.id]?.appliedAt;
              return d ? ageInDays(d) <= 7 : false;
            }).length,
            label: "This week",
            color: "var(--acc-strong)",
          },
          {
            value: rows.filter((r) => r.odds === "Strong").length,
            label: "Strong odds",
            color: "var(--fg)",
          },
        ];

  let lastDate: string | null = null;

  return (
    <div>
      <section className="list-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="big-title">{variant === "bookmarks" ? "Bookmarks" : "Applied"}</span>
          <span className="meta dim">
            {variant === "bookmarks"
              ? "Shortlist — ranked by odds, not by date"
              : "Dated log · auto-stamped when you mark applied"}
          </span>
        </div>
        <div className="stat-row" style={{ paddingBottom: 6 }}>
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <b style={{ color: s.color, fontSize: 25 }}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="meta" style={{ padding: "70px 0", color: "rgba(var(--fg-rgb),.34)" }}>
          {variant === "bookmarks"
            ? "Nothing starred yet — open a role on the feed and bookmark it."
            : "Nothing logged yet — mark a role applied and it lands here, dated."}
        </p>
      ) : (
        rows.map((role) => {
          const entry = state[role.id] ?? {};
          const appliedAt = entry.appliedAt ?? null;
          const showGroup = variant === "applied" && appliedAt !== lastDate;
          if (variant === "applied") lastDate = appliedAt;

          return (
            <div key={role.id}>
              {showGroup && (
                <div className="group-head">
                  <span>{appliedAt ? fmtDate(appliedAt) : "undated"}</span>
                  <i />
                </div>
              )}
              <div className="list-row">
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: appliedAt && variant === "bookmarks"
                      ? "var(--acc2)"
                      : "rgba(var(--fg-rgb),.4)",
                  }}
                >
                  {variant === "bookmarks"
                    ? appliedAt
                      ? `applied ${fmtDate(appliedAt)}`
                      : `found ${ageLabel(ageInDays(role.firstSeenAt))}`
                    : TIER_SHORT[role.tier]}
                </span>

                <span className="row-main">
                  <a
                    href={role.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-role"
                    style={{ color: "rgba(var(--fg-rgb),.85)" }}
                  >
                    {role.role}
                  </a>
                  <span className="row-sub">{role.company}</span>
                </span>

                <span className="row-loc" data-local={isLocal(role.location)}>
                  {role.location}
                </span>

                <span className="tag">{role.leadWithTag}</span>

                <span
                  className="mono"
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: oddsColor(role.odds),
                  }}
                >
                  {role.odds} {role.oddsScore}
                </span>

                <button
                  type="button"
                  className="linkish"
                  onClick={() => toggleApplied(role.id)}
                  style={{
                    justifySelf: "end",
                    fontFamily: "var(--font-plex-mono), monospace",
                    fontSize: 10,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: entry.applied ? "rgba(var(--fg-rgb),.45)" : "rgba(var(--fg-rgb),.6)",
                  }}
                >
                  {variant === "applied" ? "Undo" : entry.applied ? "Applied" : "Mark applied"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
