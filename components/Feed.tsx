"use client";

import { useMemo, useState } from "react";
import type { Odds, Role, SourceFailure } from "@/lib/types";
import { ageInDays, citiesOf, isChennai, isLocal } from "@/lib/view";
import { RoleRow } from "./RoleRow";
import { useRoleState } from "./StateProvider";

const ODDS_FILTERS: Array<Odds | "All"> = ["All", "Strong", "Moderate", "Reach"];

/** The only three families the scanner keeps. */
const CATEGORIES: Array<{ key: "All" | Role["category"]; label: string }> = [
  { key: "All", label: "All roles" },
  { key: "ai-ml", label: "AI/ML" },
  { key: "data", label: "Data" },
  { key: "swe", label: "Software" },
];

export function Feed({
  roles,
  failures,
  watchlist,
}: {
  roles: Role[];
  failures: SourceFailure[];
  watchlist: Array<{ name: string; watchUrl: string }>;
}) {
  const { state } = useRoleState();
  const [odds, setOdds] = useState<Odds | "All">("All");
  const [query, setQuery] = useState("");
  const [localOnly, setLocalOnly] = useState(false);
  const [city, setCity] = useState<string>("All");
  const [cat, setCat] = useState<"All" | Role["category"]>("All");
  const [newOnly, setNewOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Applied roles leave the feed (they live under Applied), and closed
  // listings are only retained for the log — neither belongs here.
  const open = useMemo(
    () => roles.filter((r) => r.status === "open" && !state[r.id]?.applied),
    [roles, state],
  );

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of open) {
      for (const c of citiesOf(r.location)) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => (a[0] === "Chennai" ? -1 : b[0] === "Chennai" ? 1 : b[1] - a[1]))
      .map(([name, n]) => ({ name, n }));
  }, [open]);

  const feed = useMemo(() => {
    let out = open;
    if (odds !== "All") out = out.filter((r) => r.odds === odds);
    if (city !== "All") out = out.filter((r) => citiesOf(r.location).includes(city));
    if (cat !== "All") out = out.filter((r) => r.category === cat);
    if (localOnly) out = out.filter((r) => isLocal(r.location));
    if (newOnly) out = out.filter((r) => r.isNew || ageInDays(r.firstSeenAt) === 0);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        `${r.company} ${r.role} ${r.location} ${r.leadWithTag}`.toLowerCase().includes(q),
      );
    }
    return [...out].sort(
      (a, b) => ageInDays(a.firstSeenAt) - ageInDays(b.firstSeenAt) || b.oddsScore - a.oddsScore,
    );
  }, [open, odds, city, cat, localOnly, newOnly, query]);

  const newCount = open.filter((r) => r.isNew || ageInDays(r.firstSeenAt) === 0).length;
  const strongCount = open.filter((r) => r.odds === "Strong").length;
  const chennaiCount = open.filter((r) => isChennai(r.location)).length;

  return (
    <div>
      <section className="hero">
        <div className="hero-left">
          <span className="hero-num">{String(newCount).padStart(2, "0")}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingBottom: 12 }}>
            <span className="hero-title">
              {newCount === 1 ? "role opened in today's scan" : "roles opened in today's scan"}
            </span>
            <span className="meta dim">First seen today · apply inside 48h</span>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <b>{open.length}</b>
            <span>Open now</span>
          </div>
          <div className="stat">
            <b style={{ color: "var(--acc-strong)" }}>{strongCount}</b>
            <span>Strong odds</span>
          </div>
          <div className="stat">
            <b>{chennaiCount}</b>
            <span>Chennai</span>
          </div>
        </div>
      </section>

      <section className="filterbar no-print">
        <div className="search">
          <span style={{ color: "rgba(var(--fg-rgb),.32)" }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="company, role, keyword"
            aria-label="Search roles"
          />
        </div>

        <span className="vrule" />

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {ODDS_FILTERS.map((o) => (
            <button
              key={o}
              type="button"
              className="pill"
              data-on={odds === o}
              onClick={() => setOdds(o)}
            >
              {o}
            </button>
          ))}
        </div>

        <span className="vrule" />

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="pill"
              data-on={cat === c.key}
              onClick={() => setCat(c.key)}
            >
              {c.label}
              {c.key !== "All" && (
                <span style={{ opacity: 0.55 }}>
                  {" "}
                  {open.filter((r) => r.category === c.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <span className="vrule" />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button
            type="button"
            className="toggle"
            data-on={localOnly}
            onClick={() => setLocalOnly((v) => !v)}
          >
            <i style={localOnly ? { background: "var(--acc2)", boxShadow: "0 0 10px var(--acc2)" } : undefined} />
            Chennai + remote
          </button>
          <button
            type="button"
            className="toggle"
            data-on={newOnly}
            onClick={() => setNewOnly((v) => !v)}
          >
            <i style={newOnly ? { background: "#ff8a3d", boxShadow: "0 0 10px #ff8a3d" } : undefined} />
            New today only
          </button>
        </div>

        <span style={{ flex: 1 }} />
        <span style={{ color: "rgba(var(--fg-rgb),.4)" }}>
          {feed.length} of {open.length} shown
        </span>
      </section>

      <section className="citybar no-print">
        <span className="citybar-label">Location</span>
        <button type="button" className="pill" data-on={city === "All"} onClick={() => setCity("All")}>
          All
        </button>
        {cities.map((c) => (
          <button
            key={c.name}
            type="button"
            className="pill"
            data-on={city === c.name}
            onClick={() => setCity(c.name)}
          >
            {c.name} <span style={{ opacity: 0.55 }}>{c.n}</span>
          </button>
        ))}
      </section>

      {feed.length === 0 ? (
        <p className="meta" style={{ padding: "70px 0", color: "rgba(var(--fg-rgb),.34)" }}>
          Nothing matches these filters.
        </p>
      ) : (
        feed.map((role, i) => {
          const days = ageInDays(role.firstSeenAt);
          const fresh = role.isNew || days === 0;
          const prevFresh =
            i > 0 &&
            (feed[i - 1].isNew || ageInDays(feed[i - 1].firstSeenAt) === 0);
          const showGroup = i === 0 || (prevFresh && !fresh);

          return (
            <div key={role.id}>
              {showGroup && (
                <div className="group-head" data-hot={fresh}>
                  <span>
                    {fresh ? "First seen today — act inside 48h" : "Still open — earlier scans"}
                  </span>
                  <i />
                </div>
              )}
              <RoleRow
                role={role}
                expanded={expanded === role.id}
                onToggle={() => setExpanded(expanded === role.id ? null : role.id)}
              />
            </div>
          );
        })
      )}

      <section className="slabs no-print">
        <div className="slab">
          <div className="slab-head">
            <span style={{ color: "rgba(var(--fg-rgb),.45)" }}>Check by hand</span>
            <span style={{ color: "rgba(var(--fg-rgb),.3)" }}>
              {watchlist.length} companies · no scrapable feed
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {watchlist.map((c) => (
              <a
                key={c.name}
                className="chip"
                href={c.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>

        <div className="slab">
          <div className="slab-head">
            <span style={{ color: "rgba(var(--fg-rgb),.45)" }}>Failed this run</span>
            <span style={{ color: "rgba(var(--fg-rgb),.3)" }}>
              {failures.length === 0 ? "all sources ok" : `${failures.length} sources`}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {failures.length === 0 ? (
              <span className="mono" style={{ fontSize: 10.5, color: "rgba(var(--fg-rgb),.4)" }}>
                Every source answered on the last run.
              </span>
            ) : (
              failures.map((f) => (
                <div
                  key={f.source}
                  className="mono"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 10.5,
                    letterSpacing: ".05em",
                    color: "rgba(var(--fg-rgb),.72)",
                  }}
                >
                  <span>{f.sourceLabel}</span>
                  <span style={{ color: "rgba(var(--fg-rgb),.36)" }}>{f.error}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
