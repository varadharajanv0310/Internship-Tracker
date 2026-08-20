/**
 * ATS board discovery.
 *
 *   npm run discover
 *
 * Crawls each company's careers page, reads whichever ATS it embeds, verifies
 * the board actually serves postings, and caches the result in
 * data/boards.json. The daily scan then reads that file, so discovery cost is
 * paid once rather than every run.
 *
 * Boards rarely move, so re-run this occasionally (or when a company stops
 * showing up in the feed), not daily.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DISCOVER_TARGETS } from "../lib/companies";
import { norm, todayISO } from "../lib/normalize";
import { getText, decodeEntities, stripTags } from "./sources/base";
import { discoverBoard, extractCandidates, verify, type Board, type BoardsFile } from "./sources/boards";

/**
 * Most careers pages are client-rendered, so their ATS link is not in the raw
 * HTML — 68 of 77 crawls came back empty for exactly that reason. The job
 * trackers, though, are full of real apply URLs that ARE ATS links, already
 * paired with a company name in the same table row. Harvesting those finds
 * boards the careers-page crawl cannot see.
 */
const TRACKERS = [
  "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/INTERN_INTL.md",
  "https://raw.githubusercontent.com/speedyapply/2027-AI-College-Jobs/main/INTERN_INTL.md",
  "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/NEW_GRAD_INTL.md",
];

async function harvestFromTrackers(
  known: Set<string>,
): Promise<{ boards: Board[]; scanned: number }> {
  const pairs = new Map<string, string>(); // company -> apply url
  let scanned = 0;

  for (const url of TRACKERS) {
    let md: string;
    try {
      md = await getText(url);
    } catch {
      continue;
    }
    let lastCompany = "";
    for (const line of md.split("\n")) {
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 4) continue;
      let company = decodeEntities(stripTags(cells[0])).replace(/[↳➔→]/g, "").trim();
      if (!company || cells[0].includes("↳")) company = lastCompany;
      if (!company || /^company$/i.test(company)) continue;
      lastCompany = company;

      const href = cells[3]?.match(/href="([^"]+)"/)?.[1];
      if (!href) continue;
      scanned++;
      if (!pairs.has(company)) pairs.set(company, decodeEntities(href));
    }
  }

  const found: Board[] = [];
  const entries = [...pairs.entries()].filter(([company]) => !known.has(norm(company)));

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ([company, href]) => {
        const candidates = extractCandidates(href);
        for (const c of candidates) {
          const board = await verify(company, c);
          if (board) return { ...board, discoveredFrom: "tracker apply link" };
        }
        return null;
      }),
    );
    for (const b of results) {
      if (!b) continue;
      found.push(b);
      const where = b.kind === "workday" ? `${b.tenant}/${b.site}@${b.cluster}` : b.token;
      console.log(
        `  harvest ${b.company.padEnd(21)} ${b.kind.padEnd(16)} ${String(where).padEnd(34)} ${b.jobs} jobs`,
      );
    }
  }
  return { boards: found, scanned };
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "boards.json");

const CONCURRENCY = 5;

async function main(): Promise<void> {
  const only = process.argv[2]?.toLowerCase();
  const targets = only
    ? DISCOVER_TARGETS.filter((t) => t.name.toLowerCase().includes(only))
    : DISCOVER_TARGETS;

  if (targets.length === 0) {
    console.error(`No company matches "${only}".`);
    process.exit(1);
  }

  console.log(`\nInternship Radar — board discovery`);
  console.log(`Crawling ${targets.length} careers pages.\n`);

  // Keep previously-found boards so one flaky crawl does not lose a token.
  let previous: BoardsFile | null = null;
  try {
    previous = JSON.parse(await readFile(OUT, "utf8")) as BoardsFile;
  } catch {
    previous = null;
  }
  const kept = new Map<string, Board>((previous?.boards ?? []).map((b) => [b.company, b]));

  const boards: Board[] = [];
  const misses: Array<{ company: string; reason: string }> = [];

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (t) => ({ target: t, ...(await discoverBoard(t.name, t.careersUrl)) })),
    );
    for (const { target, board, reason } of results) {
      if (board) {
        boards.push(board);
        const where =
          board.kind === "workday"
            ? `${board.tenant}/${board.site}@${board.cluster}`
            : board.token;
        console.log(
          `  found  ${target.name.padEnd(22)} ${board.kind.padEnd(16)} ${String(where).padEnd(34)} ${board.jobs} jobs`,
        );
      } else {
        const carry = kept.get(target.name);
        if (carry) {
          boards.push(carry);
          console.log(`  kept   ${target.name.padEnd(22)} previous ${carry.kind} board (${reason})`);
        } else {
          misses.push({ company: target.name, reason: reason ?? "unknown" });
          console.log(`  miss   ${target.name.padEnd(22)} ${reason}`);
        }
      }
    }
  }

  // Companies not crawled this run keep whatever was already known.
  if (only) {
    for (const [company, board] of kept) {
      if (!boards.some((b) => b.company === company)) boards.push(board);
    }
  }

  // Second pass: mine the trackers' apply links for boards the crawl missed.
  let harvested = 0;
  if (!only) {
    console.log("\n  harvesting ATS links from job trackers…\n");
    const known = new Set(boards.map((b) => norm(b.company)));
    const res = await harvestFromTrackers(known);
    harvested = res.boards.length;
    boards.push(...res.boards);
    console.log(`\n  scanned ${res.scanned} tracker apply links\n`);
  }

  // Never keep two boards for the same company.
  const deduped = new Map<string, Board>();
  for (const b of boards) {
    const key = norm(b.company);
    const existing = deduped.get(key);
    if (!existing || (b.jobs ?? 0) > (existing.jobs ?? 0)) deduped.set(key, b);
  }
  boards.length = 0;
  boards.push(...deduped.values());

  boards.sort((a, b) => a.company.localeCompare(b.company));

  const file: BoardsFile = { discoveredAt: todayISO(), boards, misses };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(file, null, 2)}\n`, "utf8");

  const byKind = boards.reduce<Record<string, number>>((acc, b) => {
    acc[b.kind] = (acc[b.kind] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`
────────────────────────────────────────────────
  crawled          ${targets.length}
  boards found     ${boards.length}   ${Object.entries(byKind).map(([k, n]) => `${k}:${n}`).join("  ")}
  from trackers    ${harvested}
  no board found   ${misses.length}
  written to       data/boards.json
────────────────────────────────────────────────
`);
}

main().catch((err) => {
  console.error("discover failed:", err);
  process.exit(1);
});
