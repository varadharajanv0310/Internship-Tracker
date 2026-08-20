import { norm } from "../../lib/normalize";
import type { Source } from "./base";
import { loadDiscoveredSources } from "./discovered";
import { tier1Sources, TIER1_HARDCODED_COMPANIES } from "./tier1";
import { tier2Sources } from "./tier2";
import { tier3Sources, TIER3_HARDCODED_COMPANIES } from "./tier3";
import { tier4Sources } from "./tier4";
import { tier5Sources } from "./tier5";
import { tier6Sources, SILENT_SOURCE_IDS } from "./tier6";

const HARDCODED = new Set(
  [...TIER1_HARDCODED_COMPANIES, ...TIER3_HARDCODED_COMPANIES].map(norm),
);

/**
 * Swept in priority order. Discovered first-party boards slot in behind the
 * hand-written tier-1 sources but ahead of the aggregators, and any company
 * already covered by a hand-written source is skipped so it is not scanned
 * twice.
 */
export async function loadAllSources(): Promise<Source[]> {
  const discovered = (await loadDiscoveredSources()).filter((s) => {
    const company = s.label.replace(/\s*\([^)]*\)\s*$/, "");
    return !HARDCODED.has(norm(company));
  });

  return [
    ...tier1Sources,
    ...discovered.filter((s) => s.tier === 1),
    ...tier2Sources,
    ...tier3Sources,
    ...discovered.filter((s) => s.tier !== 1),
    ...tier4Sources,
    ...tier5Sources,
    ...tier6Sources,
  ];
}

export { SILENT_SOURCE_IDS };
export type { Source, RawRole } from "./base";
