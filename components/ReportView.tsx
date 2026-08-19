"use client";

import Link from "next/link";
import type { Role, WeeklyReport } from "@/lib/types";

function RoleLine({ role, rank }: { role: Role; rank?: number }) {
  return (
    <li className="print-plain rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {rank !== undefined && (
          <span className="font-mono text-xs text-zinc-500">{rank}.</span>
        )}
        <span className="font-semibold text-zinc-100">{role.company}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-200">{role.role}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        <span>{role.location}</span>
        {role.stipend && (
          <>
            <span>·</span>
            <span className="text-emerald-400">{role.stipend}</span>
          </>
        )}
        <span>·</span>
        <span
          className={
            role.odds === "Strong"
              ? "text-emerald-400"
              : role.odds === "Moderate"
                ? "text-amber-400"
                : "text-rose-400"
          }
        >
          {role.odds} ({role.oddsScore}/100)
        </span>
        <span>·</span>
        <span>lead with {role.leadWithTag}</span>
        <span>·</span>
        <a
          href={role.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 underline-offset-2 hover:underline"
        >
          apply
        </a>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{role.leadWith}</p>
    </li>
  );
}

export function ReportView({
  report,
  weeks,
}: {
  report: WeeklyReport;
  weeks: string[];
}) {
  const { numbers } = report;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Weekly report · {report.week}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {report.weekStart} → {report.weekEnd}
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          {weeks.length > 1 && (
            <select
              defaultValue={report.week}
              onChange={(e) => {
                window.location.href = `/report/${e.target.value}`;
              }}
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-zinc-200 outline-none"
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Download PDF
          </button>
        </div>
      </header>

      {report.empty ? (
        <div className="print-plain rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-zinc-200">Nothing new opened this week.</p>
          <p className="mt-1 text-sm text-zinc-500">
            No roles crossed the radar between {report.weekStart} and {report.weekEnd},
            and nothing is closing in the next 14 days.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-300">
              🚨 Newly opened this week ({report.newlyOpened.length})
            </h2>
            {report.newlyOpened.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No new roles surfaced.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {report.newlyOpened.map((role) => (
                  <RoleLine key={role.id} role={role} />
                ))}
              </ul>
            )}
          </section>

          {report.topNew.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Top {report.topNew.length} to prioritise
              </h2>
              <ul className="mt-2 space-y-2">
                {report.topNew.map((role, i) => (
                  <RoleLine key={role.id} role={role} rank={i + 1} />
                ))}
              </ul>
            </section>
          )}

          {report.deadlines.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-300">
                ⏳ Closing within 14 days
              </h2>
              <ul className="mt-2 space-y-2">
                {report.deadlines.map((role) => (
                  <RoleLine key={role.id} role={role} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="print-plain rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          My week in numbers
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-4">
          {[
            { label: "new roles surfaced", value: numbers.newRoles },
            { label: "bookmarked", value: numbers.bookmarked },
            { label: "applied to", value: numbers.applied },
          ].map((n) => (
            <div key={n.label}>
              <dd className="text-2xl font-semibold text-zinc-100">{n.value}</dd>
              <dt className="mt-0.5 text-xs text-zinc-500">{n.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-zinc-600">
          Bookmarks count roles first seen this week; applications count anything
          stamped applied between {report.weekStart} and {report.weekEnd}.
        </p>
      </section>

      <p className="no-print text-xs text-zinc-600">
        Generated {new Date(report.generatedAt).toUTCString()} ·{" "}
        <Link href="/" className="underline-offset-2 hover:text-zinc-400 hover:underline">
          back to feed
        </Link>
      </p>
    </div>
  );
}
