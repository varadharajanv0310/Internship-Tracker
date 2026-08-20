import Link from "next/link";
import { listReportWeeks, loadReport } from "@/lib/db";
import { fmtDate } from "@/lib/view";
import type { WeeklyReport } from "@/lib/types";

/** One-line summary derived from the week's own contents. */
function headline(report: WeeklyReport): string {
  if (report.empty || report.newlyOpened.length === 0) {
    return "Quiet week — nothing new crossed the radar";
  }
  const top = report.newlyOpened[0];
  const companies = [...new Set(report.newlyOpened.slice(0, 3).map((r) => r.company))];
  if (companies.length > 1) {
    return `${companies.slice(0, 2).join(" and ")} opened roles; ${report.newlyOpened.length} new in total`;
  }
  return `${top.company} — ${top.role}`;
}

export default async function PastReportsPage() {
  const weeks = await listReportWeeks();
  const reports = (await Promise.all(weeks.map((w) => loadReport(w))))
    .filter((r): r is WeeklyReport => r !== null);

  return (
    <div>
      <section className="list-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="big-title">Past reports</span>
          <span className="meta dim">Every Sunday since the radar went live</span>
        </div>
      </section>

      {reports.length === 0 ? (
        <p className="meta" style={{ padding: "70px 0", color: "rgba(var(--fg-rgb),.34)" }}>
          No reports archived yet.
        </p>
      ) : (
        reports.map((report, i) => (
          <Link
            key={report.week}
            href={`/report/${report.week}`}
            className="past-row"
            style={{ color: "inherit" }}
          >
            <span
              className="mono"
              style={{
                fontSize: 11.5,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: i === 0 ? "var(--acc)" : "rgba(var(--fg-rgb),.6)",
              }}
            >
              {fmtDate(report.weekStart)} – {fmtDate(report.weekEnd)}
            </span>

            <span
              style={{
                fontSize: 14.5,
                color: "rgba(var(--fg-rgb),.78)",
                letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {headline(report)}
            </span>

            <span
              className="mono hide-sm"
              style={{ fontSize: 11, color: "rgba(var(--fg-rgb),.5)", textAlign: "right" }}
            >
              {report.numbers.newRoles} new
            </span>
            <span
              className="mono hide-sm"
              style={{ fontSize: 11, color: "rgba(var(--fg-rgb),.5)", textAlign: "right" }}
            >
              {report.numbers.applied} applied
            </span>
            <span
              className="mono hide-sm"
              style={{ fontSize: 11, color: "var(--acc-strong)", textAlign: "right" }}
            >
              {report.newlyOpened.filter((r) => r.odds === "Strong").length} strong
            </span>

            <span
              className="mono"
              style={{
                justifySelf: "end",
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "rgba(var(--fg-rgb),.55)",
              }}
            >
              → Open
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
