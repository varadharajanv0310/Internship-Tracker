/**
 * Daily scan.
 *
 *   npm run scan
 *
 * Sweeps every source in priority order, filters to internships this profile
 * is actually eligible for, diffs against /data/history.json, rates each role,
 * and writes /data/db.json + /data/history.json.
 *
 * One dead source never fails the run: every source is isolated and its error
 * is recorded in db.failures, which the dashboard renders at the bottom.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Db, History, Role, SourceFailure, StateMap, Tier } from "../lib/types";
import { exclusionReason, pickLeadWith, rateOdds } from "../lib/odds";
import {
  bucketLocation,
  extractDeadline,
  extractStipend,
  fingerprint,
  isIndiaOrRemote,
  isRelevantDiscipline,
  looksLikeInternship,
  norm,
  todayISO,
} from "../lib/normalize";
import { readKvState } from "../lib/state";
import { loadAllSources, SILENT_SOURCE_IDS, type RawRole, type Source } from "./sources";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const DB_PATH = join(DATA, "db.json");
const HISTORY_PATH = join(DATA, "history.json");
const STATE_PATH = join(DATA, "state.json");

const CONCURRENCY = 14;

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

interface SourceOutcome {
  source: Source;
  roles: RawRole[];
  error: string | null;
}

async function runSource(source: Source): Promise<SourceOutcome> {
  const started = Date.now();
  try {
    const roles = await source.run();
    console.log(
      `  ok    [t${source.tier}] ${source.id.padEnd(28)} ${String(roles.length).padStart(4)} raw  (${Date.now() - started}ms)`,
    );
    return { source, roles, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const silent = SILENT_SOURCE_IDS.has(source.id);
    console.log(
      `  ${silent ? "skip" : "FAIL"}  [t${source.tier}] ${source.id.padEnd(28)} ${message.slice(0, 60)}`,
    );
    return { source, roles: [], error: message };
  }
}

async function runAll(sources: Source[]): Promise<SourceOutcome[]> {
  const results: SourceOutcome[] = [];
  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    const batch = sources.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(runSource))));
  }
  return results;
}

/** Central eligibility gate — applied identically to every source. */
function keep(raw: RawRole): boolean {
  if (!raw.company?.trim() || !raw.role?.trim() || !raw.url) return false;
  if (!raw.impliedInternship && !looksLikeInternship(raw.role)) return false;
  if (!isIndiaOrRemote(raw.location)) return false;
  if (!isRelevantDiscipline(raw.role, raw.description)) return false;
  if (exclusionReason(raw.company, raw.role, raw.description)) return false;
  return true;
}

async function main(): Promise<void> {
  const runDate = todayISO();
  const startedAt = Date.now();
  console.log(`\nInternship Radar — scan ${runDate}`);

  const history = await readJson<History>(HISTORY_PATH, { seededAt: "", entries: {} });
  const previousDb = await readJson<Db | null>(DB_PATH, null);
  const baselineRun = Object.keys(history.entries).length === 0;

  // Needed before the diff: roles he has acted on are kept even once they close.
  const trackedState: StateMap =
    (await readKvState().catch(() => null)) ?? (await readJson<StateMap>(STATE_PATH, {}));
  const isTracked = (id: string) =>
    Boolean(trackedState[id]?.applied || trackedState[id]?.bookmarked);

  const ALL_SOURCES = await loadAllSources();
  console.log(`Sweeping ${ALL_SOURCES.length} sources in priority order.
`);

  const outcomes = await runAll(ALL_SOURCES);

  // ---- normalize + filter -------------------------------------------------
  const byId = new Map<string, Role>();
  let rawCount = 0;
  let droppedExcluded = 0;

  for (const outcome of outcomes) {
    for (const raw of outcome.roles) {
      rawCount++;
      if (exclusionReason(raw.company, raw.role, raw.description)) droppedExcluded++;
      if (!keep(raw)) continue;

      const company = raw.company.trim().replace(/\s+/g, " ");
      const role = raw.role.trim().replace(/\s+/g, " ");
      const location = (raw.location || "India").trim().replace(/\s+/g, " ");
      const id = fingerprint(company, role, location);

      // First source in priority order wins the fingerprint.
      if (byId.has(id)) continue;

      const stipend = raw.stipend ?? extractStipend(raw.description);
      const rating = rateOdds({ company, role, location, description: raw.description, stipend });
      const lead = pickLeadWith(role, raw.description);
      const prior = history.entries[id];

      byId.set(id, {
        id,
        company,
        role,
        location,
        locationBucket: bucketLocation(location),
        stipend,
        url: raw.url,
        postedAt: raw.postedAt ?? null,
        firstSeenAt: prior?.firstSeenAt ?? runDate,
        lastSeenAt: runDate,
        deadline: raw.deadline ?? extractDeadline(raw.description),
        tier: outcome.source.tier as Tier,
        source: outcome.source.id,
        sourceLabel: outcome.source.label,
        odds: rating.odds,
        oddsScore: rating.score,
        oddsReasons: rating.reasons,
        leadWith: lead.project,
        leadWithTag: lead.tag,
        // A baseline run seeds history, so nothing is claimed as "just opened".
        isNew: baselineRun ? false : !prior,
        status: "open",
        closedAt: null,
      });
    }
  }

  // ---- carry forward roles from sources that failed this run --------------
  const failedSourceIds = new Set(
    outcomes.filter((o) => o.error && !SILENT_SOURCE_IDS.has(o.source.id)).map((o) => o.source.id),
  );
  // Carried-forward roles are capped so a permanently blocked source (Cloudflare
  // 403s the newsletters from datacenter IPs) cannot leave zombies in the feed.
  const STALE_AFTER_DAYS = 21;
  const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let carriedForward = 0;
  let droppedStale = 0;
  let closedTracked = 0;

  for (const role of previousDb?.roles ?? []) {
    if (byId.has(role.id)) continue;

    // Its source broke this run — the role is probably still open.
    if (failedSourceIds.has(role.source)) {
      if (role.lastSeenAt < staleCutoff) {
        droppedStale++;
        continue;
      }
      byId.set(role.id, { ...role, isNew: false, status: "open" });
      carriedForward++;
      continue;
    }

    // The source answered and the role was not in it, so the listing is gone.
    // Keep it only if he bookmarked or applied — otherwise it just leaves.
    if (isTracked(role.id)) {
      byId.set(role.id, {
        ...role,
        isNew: false,
        status: "closed",
        closedAt: role.closedAt ?? runDate,
      });
      closedTracked++;
    }
  }

  // ---- cap aggregator spam ------------------------------------------------
  // One Chennai company posted 26 of 43 listings on Internshala, one per course
  // topic (Web Development, ReactJS, Django, Python...). Cap how many a single
  // company can occupy from the aggregator feeds, keeping its best-scoring
  // roles. Company ATS boards are exempt: eight real NVIDIA reqs are eight
  // real reqs.
  const AGGREGATOR = /^(internshala|unstop|newsletter|reddit):/;
  const MAX_PER_COMPANY = 3;
  const perCompany = new Map<string, number>();
  let cappedSpam = 0;

  for (const role of [...byId.values()].sort((a, b) => b.oddsScore - a.oddsScore)) {
    if (!AGGREGATOR.test(role.source)) continue;
    const key = norm(role.company);
    const seen = (perCompany.get(key) ?? 0) + 1;
    perCompany.set(key, seen);
    if (seen > MAX_PER_COMPANY) {
      byId.delete(role.id);
      cappedSpam++;
    }
  }

  const roles = [...byId.values()].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    const dateA = a.postedAt ?? a.firstSeenAt;
    const dateB = b.postedAt ?? b.firstSeenAt;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.oddsScore - a.oddsScore;
  });

  // ---- history ------------------------------------------------------------
  const nextEntries = { ...history.entries };
  for (const role of roles.filter((r) => r.status === "open")) {
    const prior = nextEntries[role.id];
    nextEntries[role.id] = {
      id: role.id,
      firstSeenAt: prior?.firstSeenAt ?? runDate,
      lastSeenAt: runDate,
    };
  }

  const failures: SourceFailure[] = outcomes
    .filter((o) => o.error && !SILENT_SOURCE_IDS.has(o.source.id))
    .map((o) => ({
      source: o.source.id,
      sourceLabel: o.source.label,
      tier: o.source.tier as Tier,
      error: o.error as string,
    }));

  const newThisRun = roles.filter((r) => r.isNew && r.status === "open").length;

  const db: Db = {
    generatedAt: new Date().toISOString(),
    runDate,
    baselineRun,
    roles,
    failures,
    stats: {
      totalRoles: roles.length,
      newThisRun,
      sourcesOk: outcomes.filter((o) => !o.error).length,
      sourcesFailed: failures.length,
      closedTracked,
    },
  };

  await writeJson(DB_PATH, db);
  await writeJson(HISTORY_PATH, {
    seededAt: history.seededAt || runDate,
    entries: nextEntries,
  } satisfies History);

  // ---- snapshot KV state back into the repo -------------------------------
  try {
    const kvState = await readKvState().catch(() => null);
    if (kvState) {
      await writeJson(STATE_PATH, kvState);
      console.log(`\n  state: snapshotted ${Object.keys(kvState).length} entries from KV`);
    } else {
      // No KV configured — never clobber whatever is already committed.
      const existing = await readJson(STATE_PATH, {});
      await writeJson(STATE_PATH, existing);
    }
  } catch (err) {
    console.log(`\n  state: KV snapshot skipped (${err instanceof Error ? err.message : err})`);
  }

  console.log(`
────────────────────────────────────────────────
  raw listings seen     ${rawCount}
  excluded by rules     ${droppedExcluded}
  eligible roles        ${roles.filter((r) => r.status === "open").length}
  new this run          ${baselineRun ? `0 (baseline seeded)` : newThisRun}
  carried forward       ${carriedForward}${droppedStale ? ` (${droppedStale} dropped as stale)` : ""}
  closed but tracked    ${closedTracked}
  aggregator spam cut   ${cappedSpam}
  sources ok / failed   ${db.stats.sourcesOk} / ${db.stats.sourcesFailed}
  elapsed               ${((Date.now() - startedAt) / 1000).toFixed(1)}s
────────────────────────────────────────────────
`);

  if (failures.length) {
    console.log("  failed sources:");
    for (const f of failures) console.log(`    - [t${f.tier}] ${f.sourceLabel}: ${f.error}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("scan failed:", err);
  process.exit(1);
});
