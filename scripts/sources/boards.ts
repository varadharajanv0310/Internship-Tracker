/**
 * ATS board auto-discovery.
 *
 * Guessing board tokens does not work — 3 of 21 hand-guessed tokens for
 * well-known Indian companies resolved, and Razorpay's real Greenhouse token
 * is "razorpaysoftwareprivatelimited", which nobody would guess. But almost
 * every careers page links or embeds its ATS, so read the token off the page
 * and then verify it against the ATS API before trusting it.
 *
 * Run via `npm run discover`; results are cached in data/boards.json so the
 * daily scan never pays the discovery cost.
 */
import { getJson, getText, postJson, type RawRole } from "./base";
import {
  fetchAshby,
  fetchGreenhouse,
  fetchLever,
  fetchSmartRecruiters,
  fetchWorkday,
} from "./ats";


export type BoardKind =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "workday"
  | "recruitee"
  | "workable";

export interface Board {
  company: string;
  kind: BoardKind;
  /** Board slug for everything except Workday. */
  token?: string;
  /** Workday coordinates. */
  tenant?: string;
  cluster?: string;
  site?: string;
  /** How many postings the board returned when it was verified. */
  jobs?: number;
  discoveredFrom?: string;
}

export interface BoardsFile {
  discoveredAt: string;
  boards: Board[];
  misses: Array<{ company: string; reason: string }>;
}

/** Slugs that appear in ATS URLs but are not a company's board. */
const TOKEN_BLOCKLIST = new Set([
  "embed", "job_app", "jobs", "careers", "search", "api", "v1", "boards",
  "static", "assets", "www", "images", "img", "css", "js",
]);

interface Candidate {
  kind: BoardKind;
  token?: string;
  tenant?: string;
  cluster?: string;
  site?: string;
}

/** Pull every plausible ATS reference out of a careers page. */
export function extractCandidates(html: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate) => {
    const key = JSON.stringify(c);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  };

  const simple: Array<[RegExp, BoardKind]> = [
    [/(?:job-)?boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([A-Za-z0-9_-]+)/gi, "greenhouse"],
    [/jobs\.lever\.co\/([A-Za-z0-9_-]+)/gi, "lever"],
    [/api\.lever\.co\/v0\/postings\/([A-Za-z0-9_-]+)/gi, "lever"],
    [/jobs\.ashbyhq\.com\/([A-Za-z0-9_.-]+)/gi, "ashby"],
    [/api\.ashbyhq\.com\/posting-api\/job-board\/([A-Za-z0-9_.-]+)/gi, "ashby"],
    [/(?:jobs|careers)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/gi, "smartrecruiters"],
    [/api\.smartrecruiters\.com\/v1\/companies\/([A-Za-z0-9_-]+)/gi, "smartrecruiters"],
    [/([A-Za-z0-9_-]+)\.recruitee\.com/gi, "recruitee"],
    [/apply\.workable\.com\/([A-Za-z0-9_-]+)/gi, "workable"],
  ];

  for (const [re, kind] of simple) {
    for (const m of html.matchAll(re)) {
      const token = m[1];
      if (!token || TOKEN_BLOCKLIST.has(token.toLowerCase()) || token.length < 2) continue;
      push({ kind, token });
    }
  }

  // Workday needs tenant + cluster + site, and the site segment follows an
  // optional locale like /en-US/.
  const wd = /([a-z0-9_-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([A-Za-z0-9_-]+)/gi;
  for (const m of html.matchAll(wd)) {
    const [, tenant, cluster, site] = m;
    if (!tenant || !site || TOKEN_BLOCKLIST.has(site.toLowerCase())) continue;
    push({ kind: "workday", tenant, cluster, site });
  }

  return out;
}

/** Confirm a candidate actually serves postings before we commit to it. */
export async function verify(company: string, c: Candidate): Promise<Board | null> {
  try {
    let roles: RawRole[] = [];
    switch (c.kind) {
      case "greenhouse":
        roles = await fetchGreenhouse(company, c.token!);
        break;
      case "lever":
        roles = await fetchLever(company, c.token!);
        break;
      case "ashby":
        roles = await fetchAshby(company, c.token!);
        break;
      case "smartrecruiters":
        roles = await fetchSmartRecruiters(company, c.token!);
        break;
      case "workday": {
        // Verification must stay cheap — fetchWorkday walks the tenant's whole
        // India result set, which is fine once a day but far too slow when
        // probing a hundred candidates. One page is enough to prove the
        // tenant/site pair is real.
        const res = await postJson<{ jobPostings?: unknown[]; total?: number }>(
          `https://${c.tenant}.${c.cluster}.myworkdayjobs.com/wday/cxs/${c.tenant}/${c.site}/jobs`,
          { appliedFacets: {}, limit: 20, offset: 0, searchText: "" },
          { timeoutMs: 12_000 },
        );
        const n = res.jobPostings?.length ?? 0;
        if (n === 0) return null;
        return { company, ...c, jobs: res.total ?? n };
      }
      case "recruitee": {
        const res = await getJson<{ offers?: unknown[] }>(
          `https://${c.token}.recruitee.com/api/offers/`,
        );
        roles = new Array(res.offers?.length ?? 0).fill(null) as unknown as RawRole[];
        break;
      }
      case "workable": {
        const res = await getJson<{ jobs?: unknown[] }>(
          `https://apply.workable.com/api/v1/widget/accounts/${c.token}?details=true`,
        );
        roles = new Array(res.jobs?.length ?? 0).fill(null) as unknown as RawRole[];
        break;
      }
    }
    if (roles.length === 0) return null;
    return { company, ...c, jobs: roles.length };
  } catch {
    return null;
  }
}

/** Read a company's careers page and return the first board that verifies. */
export async function discoverBoard(
  company: string,
  careersUrl: string,
): Promise<{ board: Board | null; reason?: string }> {
  let html: string;
  try {
    html = await getText(careersUrl, { timeoutMs: 20_000 });
  } catch (err) {
    return { board: null, reason: `careers page unreachable (${err instanceof Error ? err.message : err})` };
  }

  const candidates = extractCandidates(html);
  if (candidates.length === 0) {
    return { board: null, reason: "no ATS reference in the careers page HTML" };
  }

  for (const c of candidates) {
    const board = await verify(company, c);
    if (board) return { board: { ...board, discoveredFrom: careersUrl } };
  }
  return { board: null, reason: `found ${candidates.length} candidate(s), none served postings` };
}

/** Turn a stored board back into roles at scan time. */
export async function fetchBoard(board: Board): Promise<RawRole[]> {
  switch (board.kind) {
    case "greenhouse":
      return fetchGreenhouse(board.company, board.token!);
    case "lever":
      return fetchLever(board.company, board.token!);
    case "ashby":
      return fetchAshby(board.company, board.token!);
    case "smartrecruiters":
      return fetchSmartRecruiters(board.company, board.token!);
    case "workday":
      return fetchWorkday({
        company: board.company,
        tenant: board.tenant!,
        cluster: board.cluster!,
        site: board.site!,
      });
    case "recruitee":
      return fetchRecruitee(board.company, board.token!);
    case "workable":
      return fetchWorkable(board.company, board.token!);
    default:
      return [];
  }
}

interface RecruiteeOffer {
  title: string;
  careers_url?: string;
  location?: string;
  city?: string;
  country_code?: string;
  published_at?: string;
  description?: string;
}

export async function fetchRecruitee(company: string, token: string): Promise<RawRole[]> {
  const res = await getJson<{ offers?: RecruiteeOffer[] }>(
    `https://${token}.recruitee.com/api/offers/`,
  );
  return (res.offers ?? []).map((o) => ({
    company,
    role: o.title,
    location: o.location ?? [o.city, o.country_code].filter(Boolean).join(", "),
    url: o.careers_url ?? `https://${token}.recruitee.com/`,
    postedAt: o.published_at ? o.published_at.slice(0, 10) : null,
    description: o.title,
  }));
}

interface WorkableJob {
  title: string;
  shortcode?: string;
  location?: { city?: string; country?: string };
  url?: string;
  published_on?: string;
}

export async function fetchWorkable(company: string, token: string): Promise<RawRole[]> {
  const res = await getJson<{ jobs?: WorkableJob[] }>(
    `https://apply.workable.com/api/v1/widget/accounts/${token}?details=true`,
  );
  return (res.jobs ?? []).map((j) => ({
    company,
    role: j.title,
    location: [j.location?.city, j.location?.country].filter(Boolean).join(", "),
    url: j.url ?? `https://apply.workable.com/${token}/j/${j.shortcode}/`,
    postedAt: j.published_on ? j.published_on.slice(0, 10) : null,
    description: j.title,
  }));
}
