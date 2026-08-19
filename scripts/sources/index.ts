import type { Source } from "./base";
import { tier1Sources } from "./tier1";
import { tier2Sources } from "./tier2";
import { tier3Sources } from "./tier3";
import { tier4Sources } from "./tier4";
import { tier5Sources } from "./tier5";
import { tier6Sources, SILENT_SOURCE_IDS } from "./tier6";

/** Swept in priority order, tier 1 first. */
export const ALL_SOURCES: Source[] = [
  ...tier1Sources,
  ...tier2Sources,
  ...tier3Sources,
  ...tier4Sources,
  ...tier5Sources,
  ...tier6Sources,
];

export { SILENT_SOURCE_IDS };
export type { Source, RawRole } from "./base";
