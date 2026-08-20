export type Odds = "Strong" | "Moderate" | "Reach";

export type LocationBucket = "Chennai" | "Remote" | "Other";

/** Source tiers, mirroring the daily sweep order. */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export const TIER_LABELS: Record<Tier, string> = {
  1: "Big-tech & Quant ATS",
  2: "GitHub daily trackers",
  3: "Chennai + remote rolling",
  4: "India newsletters (2028 batch)",
  5: "Research labs & fellowships",
  6: "Reddit / community",
};

export interface Role {
  /** Stable id = normalized(company + role + location), hashed. */
  id: string;
  company: string;
  role: string;
  location: string;
  locationBucket: LocationBucket;
  /** Raw stipend string when the listing exposes one. */
  stipend: string | null;
  /** Direct application link. */
  url: string;
  /** ISO date the source says the role was posted, when available. */
  postedAt: string | null;
  /** ISO date this scanner first saw the role. */
  firstSeenAt: string;
  /** ISO date of the most recent run that still saw the role. */
  lastSeenAt: string;
  /** ISO date of an application deadline, when the source exposes one. */
  deadline: string | null;
  tier: Tier;
  /** Human-readable source id, e.g. "workday:nvidia". */
  source: string;
  sourceLabel: string;
  odds: Odds;
  /** 0-100 score behind the odds pill; kept for sorting and transparency. */
  oddsScore: number;
  /** Why the scanner rated it this way. */
  oddsReasons: string[];
  /** Which of his projects to headline in the application. */
  leadWith: string;
  leadWithTag: string;
  /** True when this fingerprint was first seen in the most recent run. */
  isNew: boolean;
  /**
   * "closed" = the listing no longer appears at its source. Closed roles are
   * only retained when they are bookmarked or applied, so the application log
   * does not lose entries the moment a company takes the req down.
   */
  status: "open" | "closed";
  /** ISO date the role was first seen missing from a working source. */
  closedAt: string | null;
}

export interface SourceFailure {
  source: string;
  sourceLabel: string;
  tier: Tier;
  error: string;
}

export interface Db {
  generatedAt: string;
  /** ISO date of the run that produced this file. */
  runDate: string;
  /** True when history was empty and this run only established a baseline. */
  baselineRun: boolean;
  roles: Role[];
  failures: SourceFailure[];
  stats: {
    totalRoles: number;
    newThisRun: number;
    sourcesOk: number;
    sourcesFailed: number;
    /** Closed-but-tracked roles retained for the application log. */
    closedTracked: number;
  };
}

export interface HistoryEntry {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface History {
  seededAt: string;
  entries: Record<string, HistoryEntry>;
}

export interface RoleState {
  bookmarked?: boolean;
  applied?: boolean;
  /** ISO date auto-stamped when `applied` first flips true. */
  appliedAt?: string | null;
}

export type StateMap = Record<string, RoleState>;

export interface WeeklyReport {
  week: string; // YYYY-Www
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  newlyOpened: Role[];
  topNew: Role[];
  deadlines: Role[];
  numbers: {
    newRoles: number;
    bookmarked: number;
    applied: number;
  };
  empty: boolean;
}
