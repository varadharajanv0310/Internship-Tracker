/**
 * Presentation helpers for the Aurora design.
 * Client-safe — no node builtins in here.
 */
import type { Odds, Role, Tier } from "./types";

/** Compact tier names used on each row. */
export const TIER_SHORT: Record<Tier, string> = {
  1: "careers API",
  2: "job tracker",
  3: "rolling feed",
  4: "aggregator",
  5: "research lab",
  6: "community post",
};

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** Whole days between an ISO date and today (IST). */
export function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = Date.parse(`${iso}T00:00:00Z`);
  const now = Date.parse(`${todayIST()}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return 0;
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

export function ageLabel(days: number): string {
  if (days === 0) return "new";
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  return `${Math.round(days / 7)} wks`;
}

/**
 * Urgency decay — a role found today reads bright, one found weeks ago fades.
 * Floors at .16 so nothing becomes invisible.
 */
export function freshness(days: number): number {
  return Math.max(0.16, 1 - days / 18);
}

export function oddsColor(odds: Odds): string {
  if (odds === "Strong") return "var(--acc-strong)";
  if (odds === "Moderate") return "var(--acc2)";
  return "rgba(var(--fg-rgb),.4)";
}

export function scoreFill(odds: Odds): string {
  if (odds === "Strong") return "linear-gradient(90deg,#ff8a3d,#ffd7a8)";
  if (odds === "Moderate") return "linear-gradient(90deg,#6b4ad9,var(--acc2))";
  return "rgba(var(--fg-rgb),.28)";
}

export function isLocal(location: string): boolean {
  return /chennai|remote|work from home|wfh/i.test(location);
}

export function isChennai(location: string): boolean {
  return /chennai|madras/i.test(location);
}

/**
 * Sources spell the same place many ways — "Bangalore", "Bengaluru",
 * "Bangalore,India" and "Bengaluru, India" are all one city. Collapse raw
 * strings onto a canonical set so the city filter and counts mean something.
 * A listing can legitimately name several ("Bangalore, Hyderabad").
 */
const CITY_RULES: Array<[RegExp, string]> = [
  [/chennai|madras|sholinganallur|siruseri|guindy|taramani/i, "Chennai"],
  [/bengaluru|bangalore/i, "Bengaluru"],
  [/hyderabad|secunderabad/i, "Hyderabad"],
  [/pune|pimpri/i, "Pune"],
  [/mumbai|thane|navi mumbai/i, "Mumbai"],
  [/gurgaon|gurugram|noida|new delhi|\bdelhi\b|\bncr\b|faridabad/i, "Delhi NCR"],
  [/kolkata|calcutta/i, "Kolkata"],
  [/coimbatore/i, "Coimbatore"],
  [/ahmedabad|gandhinagar/i, "Ahmedabad"],
  [/kochi|cochin|trivandrum|thiruvananthapuram/i, "Kerala"],
  [/jaipur/i, "Jaipur"],
  [/indore|bhopal/i, "Indore"],
  [/chandigarh|mohali/i, "Chandigarh"],
  [/remote|work from home|\bwfh\b|anywhere/i, "Remote"],
];

/** Fallback when a listing only says "India". */
export const CITY_UNSPECIFIED = "India";

export function citiesOf(location: string): string[] {
  const hits = CITY_RULES.filter(([re]) => re.test(location)).map(([, name]) => name);
  const unique = [...new Set(hits)];
  return unique.length > 0 ? unique : [CITY_UNSPECIFIED];
}

/** Tidy label for display — "Bangalore,India" reads as "Bengaluru". */
export function locationLabel(location: string): string {
  return citiesOf(location).join(" · ");
}

export interface Reason {
  text: string;
  kind: "plus" | "minus";
}

/** The scanner writes reasons prefixed "+ " / "- "; the design colours them. */
export function splitReasons(reasons: string[]): Reason[] {
  return reasons.map((raw) => {
    const plus = raw.trimStart().startsWith("+");
    const text = raw.replace(/^\s*[+-]\s*/, "");
    return { text: `${plus ? "+" : "−"} ${text}`, kind: plus ? "plus" : "minus" };
  });
}

export function deadlineLabel(role: Role): { text: string; soon: boolean } {
  if (!role.deadline) return { text: "—", soon: false };
  const days = Math.ceil((Date.parse(`${role.deadline}T00:00:00Z`) - Date.now()) / 86_400_000);
  const text = new Date(`${role.deadline}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { text, soon: days >= 0 && days <= 14 };
}

export function fmtDate(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
