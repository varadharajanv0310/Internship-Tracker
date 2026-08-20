"use client";

import Link from "next/link";
import type { Role, WeeklyReport } from "@/lib/types";
import { fmtDate, splitReasons } from "@/lib/view";

function rangeLabel(report: WeeklyReport): string {
  const year = report.weekEnd.slice(0, 4);
  return `${fmtDate(report.weekStart)} – ${fmtDate(report.weekEnd)} ${year}`;
}

function daysLeft(iso: string): number {
  return Math.ceil((Date.parse(`${iso}T00:00:00Z`) - Date.now()) / 86_400_000);
}

/**
 * The strongest positive reason doubles as the "why bother" line. The reason
 * already names the project in parentheses, so strip that before appending the
 * lead-with — otherwise the same project is named twice in one sentence.
 */
function whyLine(role: Role): string {
  const plus = splitReasons(role.oddsReasons).find((r) => r.kind === "plus");
  const lead = `Lead with ${role.leadWith}.`;
  if (!plus) return lead;
  const claim = plus.text
    .replace(/^\+\s*/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  return `${claim}. ${lead}`;
}

export function ReportView({
  report,
  sourcesTotal,
  failures,
  manualCount,
}: {
  report: WeeklyReport;
  sourcesTotal: number;
  failures: Array<{ sourceLabel: string }>;
  manualCount: number;
}) {
  const range = rangeLabel(report);
  const closingIn7 = report.deadlines.filter((r) => r.deadline && daysLeft(r.deadline) <= 7).length;

  const mix = (() => {
    const counts = new Map<string, number>();
    for (const r of report.newlyOpened) {
      counts.set(r.leadWithTag, (counts.get(r.leadWithTag) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([tag, n]) => ({ tag, n, width: `${Math.round((n / max) * 100)}%` }));
  })();

  return (
    <div style={{ padding: "40px 0 0" }}>
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
          paddingBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span className="big-title" style={{ fontSize: 40 }}>
            Weekly report
          </span>
          <span className="meta dim">{range}</span>
        </div>
        <div
          className="meta"
          style={{ display: "flex", gap: 26, paddingBottom: 8, letterSpacing: ".12em" }}
        >
          <button type="button" className="linkish linkish-acc" onClick={() => window.print()}>
            →&ensp;Export PDF
          </button>
          <Link href="/report/archive" className="linkish" style={{ color: "rgba(var(--fg-rgb),.6)" }}>
            Past reports
          </Link>
        </div>
      </div>

      <article className="paper">
        <header className="paper-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 25, letterSpacing: "-0.02em" }}>Weekly digest — {range}</span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "rgba(22,21,26,.5)",
              }}
            >
              Internship Radar · {sourcesTotal} sources · Summer 2027
            </span>
          </div>
          <span className="paper-mark" aria-hidden="true" />
        </header>

        <div className="paper-stats">
          {[
            { value: report.numbers.newRoles, label: "Roles opened" },
            { value: report.numbers.applied, label: "You applied" },
            { value: report.newlyOpened.filter((r) => r.odds === "Strong").length, label: "Strong odds" },
            { value: closingIn7, label: "Closing in 7d" },
          ].map((s) => (
            <div className="paper-stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {report.empty ? (
          <div style={{ marginTop: 40 }}>
            <p style={{ fontSize: 16, margin: 0 }}>Nothing new opened this week.</p>
            <p style={{ fontSize: 13, color: "rgba(22,21,26,.6)", marginTop: 6 }}>
              No roles crossed the radar between {report.weekStart} and {report.weekEnd}, and nothing
              is closing in the next 14 days.
            </p>
          </div>
        ) : (
          <div className="paper-cols">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="paper-label">
                Prioritise {report.topNew.length === 1 ? "this one" : `these ${report.topNew.length}`}
              </span>
              {report.topNew.map((p, i) => (
                <div className="pick" key={p.id}>
                  <span className="mono" style={{ fontSize: 11, color: "rgba(22,21,26,.42)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 16, letterSpacing: "-0.01em" }}>
                      {p.role} — {p.company}
                    </span>
                    <span className="pick-why">{whyLine(p)}</span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      textAlign: "right",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.odds} {p.oddsScore}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <span className="paper-label">Closing soon</span>
                {report.deadlines.length === 0 ? (
                  <span style={{ fontSize: 13, color: "rgba(22,21,26,.55)" }}>
                    No dated deadlines this week.
                  </span>
                ) : (
                  report.deadlines.slice(0, 5).map((c) => (
                    <div className="closing-row" key={c.id}>
                      <span>
                        {c.company} — {c.role}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: "rgba(22,21,26,.6)" }}>
                        {c.deadline ? fmtDate(c.deadline) : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <span className="paper-label">Lead-with mix</span>
                {mix.map((m) => (
                  <div className="mix-row" key={m.tag}>
                    <span style={{ flex: "0 0 120px", color: "rgba(22,21,26,.72)" }}>{m.tag}</span>
                    <span className="mix-bar">
                      <i style={{ width: m.width }} />
                    </span>
                    <span style={{ color: "rgba(22,21,26,.5)" }}>{m.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="paper-foot">
          <span>Manual-check backlog: {manualCount} companies</span>
          <span>
            Source failures: {failures.length}
            {failures.length > 0 && ` · ${failures.map((f) => f.sourceLabel).join(", ")}`}
          </span>
        </footer>
      </article>
    </div>
  );
}
