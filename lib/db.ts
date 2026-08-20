import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Db, StateMap, WeeklyReport } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const REPORTS_DIR = join(DATA_DIR, "reports");

const EMPTY_DB: Db = {
  generatedAt: new Date(0).toISOString(),
  runDate: "—",
  baselineRun: true,
  roles: [],
  failures: [],
  stats: { totalRoles: 0, newThisRun: 0, sourcesOk: 0, sourcesFailed: 0, closedTracked: 0 },
};

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function loadDb(): Promise<Db> {
  const db = await readJson<Db>(join(DATA_DIR, "db.json"), EMPTY_DB);
  // `status` arrived after the first scans shipped; treat anything written
  // before that as open rather than hiding the whole feed.
  return {
    ...db,
    stats: { ...db.stats, closedTracked: db.stats?.closedTracked ?? 0 },
    roles: (db.roles ?? []).map((r) => ({
      ...r,
      status: r.status ?? "open",
      closedAt: r.closedAt ?? null,
    })),
  };
}

/** Committed baseline state, used to seed the client when KV is absent. */
export async function loadSeedState(): Promise<StateMap> {
  return readJson<StateMap>(join(DATA_DIR, "state.json"), {});
}

export async function listReportWeeks(): Promise<string[]> {
  try {
    const files = await readdir(REPORTS_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

export async function loadReport(week: string): Promise<WeeklyReport | null> {
  return readJson<WeeklyReport | null>(join(REPORTS_DIR, `${week}.json`), null);
}

export async function loadLatestReport(): Promise<WeeklyReport | null> {
  const weeks = await listReportWeeks();
  if (weeks.length === 0) return null;
  return loadReport(weeks[0]);
}
