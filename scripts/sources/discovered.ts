/**
 * Sources built from data/boards.json — the output of `npm run discover`.
 *
 * These are first-party company boards, which is where the good roles live.
 * A company that also appears on the tier-1 priority list is scanned as tier 1;
 * everything else is tier 3 (rolling employers).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TIER1_COMPANIES } from "../../lib/profile";
import { norm } from "../../lib/normalize";
import type { Source } from "./base";
import { fetchBoard, type Board, type BoardsFile } from "./boards";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BOARDS = join(ROOT, "data", "boards.json");

const TIER1_NAMES = new Set(TIER1_COMPANIES.map((c) => norm(c.name)));

function boardKey(b: Board): string {
  return b.kind === "workday" ? `${b.tenant}-${b.site}` : (b.token ?? b.company);
}

export async function loadDiscoveredSources(): Promise<Source[]> {
  let file: BoardsFile;
  try {
    file = JSON.parse(await readFile(BOARDS, "utf8")) as BoardsFile;
  } catch {
    return []; // discovery has not been run yet — not an error
  }

  return (file.boards ?? []).map<Source>((board) => ({
    id: `board:${board.kind}:${boardKey(board)}`,
    label: `${board.company} (${board.kind})`,
    tier: TIER1_NAMES.has(norm(board.company)) ? 1 : 3,
    run: () => fetchBoard(board),
  }));
}
