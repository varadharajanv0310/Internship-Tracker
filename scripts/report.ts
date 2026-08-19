/**
 * Weekly report generator.
 *
 *   npm run report            # current ISO week
 *   npm run report 2026-W34   # a specific week
 *
 * Writes /data/reports/YYYY-Www.json, which /report renders.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Db, Role, StateMap, WeeklyReport } from "../lib/types";
import { isoWeek, weekStart } from "../lib/normalize";
import { readKvState } from "../lib/state";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function inRange(iso: string | null, start: string, end: string): boolean {
  if (!iso) return false;
  return iso >= start && iso <= end;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
}

async function main(): Promise<void> {
  const requested = process.argv[2];
  const now = new Date();
  const week = requested && /^\d{4}-W\d{2}$/.test(requested) ? requested : isoWeek(now);

  // Resolve the Monday..Sunday span for the target week.
  let anchor = now;
  if (requested && week !== isoWeek(now)) {
    // Walk back week by week until the label matches.
    for (let i = 0; i < 260; i++) {
      const probe = new Date(now.getTime() - i * 7 * 86_400_000);
      if (isoWeek(probe) === week) {
        anchor = probe;
        break;
      }
    }
  }
  const start = weekStart(anchor);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  const db = await readJson<Db | null>(join(DATA, "db.json"), null);
  if (!db) {
    console.error("No data/db.json — run `npm run scan` first.");
    process.exit(1);
  }

  const state =
    (await readKvState().catch(() => null)) ??
    (await readJson<StateMap>(join(DATA, "state.json"), {}));

  // Roles first seen inside this week.
  const surfaced = db.roles.filter((r) => inRange(r.firstSeenAt, startIso, endIso));

  const newlyOpened = [...surfaced].sort((a, b) => b.oddsScore - a.oddsScore);
  const topNew = newlyOpened.slice(0, 6);

  const deadlines = db.roles
    .filter((r) => r.deadline && daysUntil(r.deadline) >= 0 && daysUntil(r.deadline) <= 14)
    .sort((a, b) => daysUntil(a.deadline!) - daysUntil(b.deadline!));

  const bookmarked = surfaced.filter((r) => state[r.id]?.bookmarked).length;
  const applied = Object.values(state).filter((s) =>
    inRange(s.appliedAt ?? null, startIso, endIso),
  ).length;

  const report: WeeklyReport = {
    week,
    weekStart: startIso,
    weekEnd: endIso,
    generatedAt: new Date().toISOString(),
    newlyOpened: newlyOpened.slice(0, 40) as Role[],
    topNew: topNew as Role[],
    deadlines: deadlines.slice(0, 12) as Role[],
    numbers: { newRoles: surfaced.length, bookmarked, applied },
    empty: surfaced.length === 0 && deadlines.length === 0,
  };

  const out = join(DATA, "reports", `${week}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `report ${week} (${startIso}..${endIso}): ${surfaced.length} new, ` +
      `${deadlines.length} closing soon, ${bookmarked} bookmarked, ${applied} applied -> ${out}`,
  );
}

main().catch((err) => {
  console.error("report failed:", err);
  process.exit(1);
});
