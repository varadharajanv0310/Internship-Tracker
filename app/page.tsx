import { Feed } from "@/components/Feed";
import { loadDb } from "@/lib/db";
import { TIER1_COMPANIES } from "@/lib/profile";

export default async function DashboardPage() {
  const db = await loadDb();
  const newRoles = db.roles.filter((r) => r.isNew);
  const watchlist = TIER1_COMPANIES.filter((c) => !c.live);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Open internships
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {db.baselineRun ? (
              <>
                Baseline established {db.runDate} — the next run flags anything
                that opens after this.
              </>
            ) : newRoles.length > 0 ? (
              <>
                <span className="font-medium text-rose-300">
                  {newRoles.length} newly opened
                </span>{" "}
                since the last run on {db.runDate}.
              </>
            ) : (
              <>Nothing newly opened in the {db.runDate} run.</>
            )}
          </p>
        </div>

        <dl className="flex gap-5 text-sm">
          {[
            { label: "open", value: db.stats.totalRoles },
            { label: "new", value: db.stats.newThisRun },
            { label: "sources ok", value: `${db.stats.sourcesOk}/${db.stats.sourcesOk + db.stats.sourcesFailed}` },
          ].map((stat) => (
            <div key={stat.label} className="text-right">
              <dt className="text-[11px] uppercase tracking-wider text-zinc-600">
                {stat.label}
              </dt>
              <dd className="text-lg font-semibold text-zinc-200">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Feed
        roles={db.roles}
        emptyMessage="No roles matched. The scanner keeps sweeping every morning at 06:00 IST."
      />

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold text-zinc-300">
          Tier-1 watchlist — no public API, check directly
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          These are on the priority list but expose no key-free endpoint a headless
          runner can read. They still surface through the trackers and newsletters
          when they post; these links jump straight to their search pages.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {watchlist.map((c) => (
            <a
              key={c.name}
              href={c.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              {c.name} ↗
            </a>
          ))}
        </div>
      </section>

      {db.failures.length > 0 && (
        <section className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
          <h2 className="text-sm font-semibold text-amber-200">
            Sources that failed this run ({db.failures.length})
          </h2>
          <p className="mt-1 text-xs text-amber-200/60">
            Skipped without failing the run. Roles previously found through these
            sources are carried forward rather than dropped.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-100/70">
            {db.failures.map((f) => (
              <li key={f.source}>
                <span className="font-mono text-amber-300/80">[T{f.tier}]</span>{" "}
                {f.sourceLabel} — {f.error}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
