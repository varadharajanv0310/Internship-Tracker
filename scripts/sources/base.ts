import type { Tier } from "../../lib/types";

export interface RawRole {
  company: string;
  role: string;
  location: string;
  url: string;
  stipend?: string | null;
  postedAt?: string | null;
  deadline?: string | null;
  description?: string | null;
}

export interface Source {
  id: string;
  label: string;
  tier: Tier;
  run: () => Promise<RawRole[]>;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const DEFAULT_TIMEOUT_MS = 25_000;

export class SourceError extends Error {}

/** fetch with a hard timeout and one retry on transient failure. */
export async function http(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal: ctl.signal,
        headers: {
          "user-agent": UA,
          accept: "application/json, text/html;q=0.9, */*;q=0.8",
          "accept-language": "en-IN,en;q=0.9",
          ...(rest.headers ?? {}),
        },
      });
      if (!res.ok) throw new SourceError(`HTTP ${res.status} ${res.statusText}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await sleep(1200);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new SourceError(String(lastErr));
}

export async function getJson<T = unknown>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const res = await http(url, init);
  return (await res.json()) as T;
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const res = await http(url, {
    ...init,
    method: "POST",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function getText(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<string> {
  const res = await http(url, init);
  return await res.text();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  "#039": "'", "#8217": "’", "#8216": "‘", "#8211": "–",
  "#8212": "—", "#38": "&", "#8220": "“", "#8221": "”",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#?\w+);/g, (m, code: string) => {
    if (ENTITIES[code]) return ENTITIES[code];
    if (/^#\d+$/.test(code)) return String.fromCodePoint(Number(code.slice(1)));
    if (/^#x[0-9a-f]+$/i.test(code)) return String.fromCodePoint(parseInt(code.slice(2), 16));
    return m;
  });
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** "0d" | "3d" | "2mo" -> ISO date, relative to now. */
export function ageToIso(age: string): string | null {
  const m = age.trim().match(/^(\d+)\s*(d|w|mo|y)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const days = unit === "d" ? n : unit === "w" ? n * 7 : unit === "mo" ? n * 30 : n * 365;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/** Common Indian city detector used to pull a location out of a free-text title. */
const CITIES = [
  "Chennai", "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Mumbai", "Delhi",
  "Gurgaon", "Gurugram", "Noida", "Kolkata", "Ahmedabad", "Coimbatore", "Kochi",
  "Trivandrum", "Jaipur", "Indore", "Chandigarh", "Mysuru", "Mysore", "Remote",
  "Work From Home", "Hybrid", "India",
];

export function guessLocation(text: string): string | null {
  const found = CITIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  if (found.length === 0) return null;
  // Prefer a real city over the generic "India"/"Hybrid" fallbacks.
  const specific = found.filter((c) => !["India", "Hybrid"].includes(c));
  return (specific.length ? specific : found).slice(0, 3).join(", ");
}
