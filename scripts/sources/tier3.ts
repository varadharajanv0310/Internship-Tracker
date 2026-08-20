/**
 * TIER 3 — Chennai + remote rolling employers, and the best paid
 * Internshala / Unstop listings.
 */
import { fetchGreenhouse, fetchSmartRecruiters } from "./ats";
import {
  absoluteUrl,
  decodeEntities,
  getJson,
  getText,
  guessLocation,
  stripTags,
  type RawRole,
  type Source,
} from "./base";

/* -------------------------------------------------------------- Internshala */

/**
 * Internshala is the largest source of Chennai and work-from-home listings,
 * so it is swept by category across Chennai + remote, two pages deep.
 */
const INTERNSHALA_CATEGORIES = [
  "computer science",
  "software development",
  "data science",
  "machine learning",
  "artificial intelligence",
  "web development",
  "full stack development",
  "python%2Fdjango",
  "backend development",
  "frontend development",
  "cyber security",
  "devops",
  "mobile app development",
  "ui%2Fux design",
];

const INTERNSHALA_PAGES: Array<{ label: string; url: string }> = [];
for (const cat of INTERNSHALA_CATEGORIES) {
  const pretty = decodeURIComponent(cat);
  for (const page of [1, 2]) {
    const suffix = page === 1 ? "" : `page-${page}/`;
    INTERNSHALA_PAGES.push({
      label: `${pretty} — Chennai${page > 1 ? ` p${page}` : ""}`,
      url: `https://internshala.com/internships/${cat}-internship-in-chennai/${suffix}`,
    });
    INTERNSHALA_PAGES.push({
      label: `${pretty} — work from home${page > 1 ? ` p${page}` : ""}`,
      url: `https://internshala.com/internships/work-from-home-${cat}-internship/${suffix}`,
    });
  }
}

function pluckAll(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => decodeEntities(stripTags(m[1])));
}

/**
 * The search page itself pins the location: a "-in-chennai" listing page only
 * returns Chennai roles, even when an individual slug says "multiple
 * locations". Falling back to "India" there lost real Chennai matches.
 */
function pageLocation(pageUrl: string): string {
  const u = decodeURIComponent(pageUrl).toLowerCase();
  if (/work-from-home|virtual-internship/.test(u)) return "Remote, India";
  const m = u.match(/-in-([a-z\s]+?)\/(?:page-\d+\/)?$/);
  const city = m?.[1]?.trim();
  return city ? `${city.replace(/\b\w/g, (c) => c.toUpperCase())}, India` : "India";
}

export function parseInternshala(html: string, pageUrl: string): RawRole[] {
  const hrefs = [...html.matchAll(/href="(\/internship\/detail\/[^"]+)"/g)].map((m) => m[1]);
  const titles = pluckAll(html, /class="job-title[^"]*"[^>]*>([\s\S]{0,200}?)</g);
  const companies = pluckAll(html, /<p class="company-name">([\s\S]{0,160}?)<\/p>/g);
  const fallbackLocation = pageLocation(pageUrl);

  const n = Math.min(hrefs.length, titles.length);
  const out: RawRole[] = [];
  for (let i = 0; i < n; i++) {
    const role = titles[i];
    const company = companies[i] ?? "";
    if (!role || !company) continue;

    // The detail slug is the dependable source of location:
    // "...-internship-in-chennai-at-<company>". The list markup's location
    // cell is not stable enough to zip against.
    const slug = decodeURIComponent(hrefs[i]);
    const wfh = /work-from-home|virtual-internship/.test(slug);
    const fromSlug = guessLocation(slug.replace(/-/g, " "));
    const location = fromSlug ?? fallbackLocation;

    out.push({
      company,
      role,
      location: wfh && !/remote/i.test(location) ? `${location}, Remote` : location,
      url: absoluteUrl(hrefs[i], pageUrl),
      description: `${role} internship at ${company}`,
      // Every listing on Internshala is an internship, but the titles are
      // category names ("QA Engineer", "Embedded Systems") that never contain
      // the word — so the central intern gate must be told.
      impliedInternship: true,
    });
  }
  return out;
}

/* ------------------------------------------------------------------- Unstop */

interface UnstopItem {
  id: number;
  title: string;
  seo_url?: string;
  public_url?: string;
  organisation?: { name?: string };
  regn_open?: boolean;
  updated_at?: string;
  isPaid?: boolean;
  end_date?: string;
  regnRequirements?: { end_regn_dt?: string };
  /** The real location lives here — `filters` holds eligibility categories. */
  locations?: Array<{ city?: string; state?: string; country?: string }>;
  jobDetail?: {
    min_salary?: number;
    max_salary?: number;
    /** "in_office" | "wfh" | "hybrid" */
    type?: string;
    locations?: string[];
    /** "paid" | "unpaid" — Unstop states this outright, so honour it. */
    paid_unpaid?: string;
  };
}

export async function fetchUnstop(): Promise<RawRole[]> {
  const out = new Map<string, RawRole>();

  const queries: string[] = [];
  for (const page of [1, 2, 3]) {
    queries.push(
      `https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=${page}&per_page=60&sort_by=recent`,
      `https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&jobType=internship&page=${page}&per_page=60&sort_by=recent`,
    );
  }

  for (const q of queries) {
    const res = await getJson<{ data?: { data?: UnstopItem[] } }>(q);
    const items = res.data?.data ?? [];
    if (items.length === 0) continue;

    for (const item of items) {
      const url = item.public_url
        ? `https://unstop.com/${item.public_url}`
        : `https://unstop.com/o/${item.seo_url ?? item.id}`;
      const detail = item.jobDetail;
      const unpaid = /unpaid/i.test(detail?.paid_unpaid ?? "");
      const stipend =
        detail?.min_salary || detail?.max_salary
          ? `₹${detail.min_salary ?? "?"}–${detail.max_salary ?? "?"}`
          : null;

      // Read the actual location objects. Reading `filters` here previously
      // produced "Undergraduate, Postgraduate, Engineering Students" as the
      // location, which failed the India gate for every single listing.
      const cities = (item.locations ?? [])
        .map((l) => [l.city, l.state].filter(Boolean).join(", "))
        .filter(Boolean);
      const fallback = (detail?.locations ?? []).filter(Boolean);
      const remote = detail?.type === "wfh";
      const named = (cities.length ? cities : fallback).join(" / ");
      const location = named
        ? remote
          ? `${named}, Remote`
          : `${named}, India`
        : remote
          ? "Remote, India"
          : "India";

      out.set(url, {
        company: item.organisation?.name ?? "Unstop listing",
        role: item.title,
        location,
        url,
        stipend,
        postedAt: item.updated_at ? item.updated_at.slice(0, 10) : null,
        deadline:
          item.regnRequirements?.end_regn_dt?.slice(0, 10) ??
          item.end_date?.slice(0, 10) ??
          null,
        description: `${item.title}${unpaid ? " (unpaid)" : ""}`,
        impliedInternship: true,
      });
    }
  }
  return [...out.values()];
}

/* ------------------------------------------ Named Chennai / remote employers */

/**
 * SmartRecruiters identifiers verified by hand — these companies' careers
 * pages are client-rendered, so board discovery cannot see the link, but the
 * API answers for all of them.
 */
const SMARTRECRUITERS: Array<{ company: string; id: string }> = [
  { company: "Freshworks", id: "Freshworks" },
  { company: "Fractal", id: "Fractal" },
  { company: "Swiggy", id: "Swiggy" },
  { company: "Zomato", id: "Zomato" },
  { company: "Meesho", id: "Meesho" },
  { company: "Flipkart", id: "Flipkart" },
];

const GREENHOUSE: Array<{ company: string; board: string }> = [
  { company: "Databricks India", board: "databricks" },
];

/** Careers pages with no API — anchors that read like real postings are kept. */
const CAREERS_PAGES: Array<{ id: string; company: string; url: string }> = [
  { id: "zoho", company: "Zoho", url: "https://careers.zohocorp.com/jobs/Careers" },
  { id: "wadhwaniai", company: "Wadhwani AI", url: "https://www.wadhwaniai.org/careers/" },
  { id: "planys", company: "Planys Technologies", url: "https://planystech.com/careers/" },
];

const ROLE_LIKE = /intern|trainee|graduate engineer|campus|fresher|entry level/i;
const NAV_NOISE = /^(careers?|jobs?|apply|home|about|contact|search|view all|learn more|read more|see all)$/i;

export function parseCareersAnchors(html: string, base: string, company: string): RawRole[] {
  const out = new Map<string, RawRole>();
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,220}?)<\/a>/gi)) {
    const text = decodeEntities(stripTags(m[2]));
    if (!text || text.length < 8 || text.length > 140) continue;
    if (NAV_NOISE.test(text.trim())) continue;
    if (!ROLE_LIKE.test(text)) continue;
    const url = absoluteUrl(m[1], base);
    if (!/^https?:/i.test(url)) continue;
    out.set(url, {
      company,
      role: text,
      location: guessLocation(text) ?? "India",
      url,
      description: text,
    });
  }
  return [...out.values()];
}

/** Companies already covered here, so discovery does not scan them twice. */
export const TIER3_HARDCODED_COMPANIES = [
  ...SMARTRECRUITERS.map((s) => s.company),
  ...GREENHOUSE.map((g) => g.company),
  ...CAREERS_PAGES.map((c) => c.company),
];

export const tier3Sources: Source[] = [
  ...INTERNSHALA_PAGES.map<Source>((p, i) => ({
    id: `internshala:${i}`,
    label: `Internshala — ${p.label}`,
    tier: 3,
    run: async () => parseInternshala(await getText(p.url), p.url),
  })),
  {
    id: "unstop:search",
    label: "Unstop — paid internships",
    tier: 3,
    run: fetchUnstop,
  },
  ...SMARTRECRUITERS.map<Source>((s) => ({
    id: `smartrecruiters:${s.id}`,
    label: `${s.company} (SmartRecruiters)`,
    tier: 3,
    run: () => fetchSmartRecruiters(s.company, s.id),
  })),
  ...GREENHOUSE.map<Source>((g) => ({
    id: `greenhouse:${g.board}`,
    label: `${g.company} (Greenhouse)`,
    tier: 3,
    run: () => fetchGreenhouse(g.company, g.board),
  })),
  ...CAREERS_PAGES.map<Source>((c) => ({
    id: `careers:${c.id}`,
    label: `${c.company} careers page`,
    tier: 3,
    run: async () => parseCareersAnchors(await getText(c.url), c.url, c.company),
  })),
];
