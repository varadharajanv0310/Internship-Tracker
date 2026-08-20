"use client";

import type { Role } from "@/lib/types";
import {
  TIER_SHORT,
  ageInDays,
  ageLabel,
  deadlineLabel,
  freshness,
  isLocal,
  oddsColor,
  scoreFill,
  splitReasons,
} from "@/lib/view";
import { useRoleState } from "./StateProvider";

export function RoleRow({
  role,
  expanded,
  onToggle,
}: {
  role: Role;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { state, toggleBookmark, toggleApplied } = useRoleState();
  const entry = state[role.id] ?? {};

  const days = ageInDays(role.firstSeenAt);
  const isNew = role.isNew || days === 0;
  const fresh = freshness(days);
  const local = isLocal(role.location);
  const deadline = deadlineLabel(role);
  const reasons = splitReasons(role.oddsReasons);

  return (
    <div>
      <button
        type="button"
        className="row"
        data-new={isNew}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="row-edge" aria-hidden="true" />

        <span
          className="row-age"
          style={{ color: isNew ? "var(--acc)" : `rgba(var(--fg-rgb),${(fresh * 0.55).toFixed(2)})` }}
        >
          <span
            className={`row-dot${isNew ? " dot-new" : ""}`}
            style={
              isNew
                ? undefined
                : {
                    background: local
                      ? "var(--acc2)"
                      : `rgba(var(--fg-rgb),${(fresh * 0.4).toFixed(2)})`,
                  }
            }
          />
          {ageLabel(days)}
        </span>

        <span className="row-main">
          <span className="row-role">{role.role}</span>
          <span className="row-sub">
            {role.company} · {TIER_SHORT[role.tier]}
          </span>
        </span>

        <span className="row-loc" data-local={local}>
          {role.location}
        </span>

        <span className="tag">{role.leadWithTag}</span>

        <span className="row-odds">
          <span className="row-odds-top" style={{ color: oddsColor(role.odds) }}>
            <span className="label">{role.odds}</span>
            <span className="score">{role.oddsScore}</span>
          </span>
          <span className="scorebar">
            <i style={{ width: `${role.oddsScore}%`, background: scoreFill(role.odds) }} />
          </span>
        </span>
      </button>

      {expanded && (
        <div className="detail">
          <span className="detail-why">Why {role.oddsScore}</span>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {reasons.map((r) => (
              <span key={r.text} className="reason" data-kind={r.kind}>
                {r.text}
              </span>
            ))}

            <div className="detail-facts">
              <span>
                Stipend&ensp;<b>{role.stipend ?? "—"}</b>
              </span>
              <span>
                Deadline&ensp;
                <b style={{ color: deadline.soon ? "var(--acc)" : undefined }}>{deadline.text}</b>
              </span>
              <span>
                Source&ensp;<b>{role.sourceLabel}</b>
              </span>
            </div>
          </div>

          <div className="detail-actions">
            <a href={role.url} target="_blank" rel="noopener noreferrer" className="linkish linkish-acc">
              →&ensp;Open application
            </a>
            <button
              type="button"
              className="linkish"
              onClick={() => toggleBookmark(role.id)}
              style={{ color: entry.bookmarked ? "var(--acc-strong)" : "rgba(var(--fg-rgb),.55)" }}
            >
              {entry.bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
            </button>
            <button
              type="button"
              className="linkish"
              onClick={() => toggleApplied(role.id)}
              style={{ color: entry.applied ? "var(--acc2)" : "rgba(var(--fg-rgb),.55)" }}
            >
              {entry.applied ? `Applied ${entry.appliedAt ?? ""}`.trim() : "Mark applied"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
