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

const INTERNSHALA_PAGES = [
  { label: "Computer Science — Chennai", url: "https://internshala.com/internships/computer%20science-internship-in-chennai/" },
  { label: "Data Science — Chennai", url: "https://internshala.com/internships/data%20science-internship-in-chennai/" },
  { label: "Software Dev — work from home", url: "https://internshala.com/internships/work-from-home-software-development-internship/" },
  { label: "Machine Learning — work from home", url: "https://internshala.com/internships/work-from-home-machine-learning-internship/" },
];

function pluckAll(html: string, re: RegExp): string[] {
  return [...html.matchAll(re)].map((m) => decodeEntities(stripTags(m[1])));
}

export function parseInternshala(html: string, pageUrl: string): RawRole[] {
  const hrefs = [...html.matchAll(/href="(\/internship\/detail\/[^"]+)"/g)].map((m) => m[1]);
  const titles = pluckAll(html, /class="job-title[^"]*"[^>]*>([\s\S]{0,200}?)</g);
  const companies = pluckAll(html, /<p class="company-name">([\s\S]{0,160}?)<\/p>/g);
  const stipends = pluckAll(html, /class="stipend"[^>]*>([\s\S]{0,120}?)</g);
  const locations = pluckAll(html, /class="row-1-item locations"[^>]*>([\s\S]{0,160}?)<\/div>/g);

  const n = Math.min(hrefs.length, titles.length);
  const out: RawRole[] = [];
  for (let i = 0; i < n; i++) {
    const role = titles[i];
    const company = companies[i] ?? "";
    if (!role || !company) continue;
    out.push({
      company,
      role,
      location: locations[i] || guessLocation(hrefs[i]) || "India",
      url: absoluteUrl(hrefs[i], pageUrl),
      stipend: stipends[i] || null,
      description: `${role} at ${company}`,
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
  jobDetail?: {
    min_salary?: number;
    max_salary?: number;
    job_location?: string;
    /** "paid" | "unpaid" — Unstop states this outright, so honour it. */
    paid_unpaid?: string;
  };
  filters?: Array<{ name?: string }>;
}

export async function fetchUnstop(): Promise<RawRole[]> {
  const out = new Map<string, RawRole>();
  const queries = [
    "https://unstop.com/api/public/opportunity/search-result?opportunity=internships&page=1&per_page=60&sort_by=recent",
    "https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&jobType=internship&page=1&per_page=40&sort_by=recent",
  ];
  for (const q of queries) {
    const res = await getJson<{ data?: { data?: UnstopItem[] } }>(q);
    for (const item of res.data?.data ?? []) {
      const url = item.public_url
        ? `https://unstop.com/${item.public_url}`
        : `https://unstop.com/o/${item.seo_url ?? item.id}`;
      const salary = item.jobDetail;
      // He is not applying to unpaid listings; Unstop labels them explicitly.
      const unpaid = /unpaid/i.test(salary?.paid_unpaid ?? "");
      const stipend =
        salary?.min_salary || salary?.max_salary
          ? `₹${salary.min_salary ?? "?"}–${salary.max_salary ?? "?"}`
          : null;
      out.set(url, {
        company: item.organisation?.name ?? "Unstop listing",
        role: item.title,
        location: salary?.job_location ?? (item.filters ?? []).map((f) => f.name).filter(Boolean).join(", ") ?? "India",
        url,
        stipend,
        postedAt: item.updated_at ? item.updated_at.slice(0, 10) : null,
        deadline: item.regnRequirements?.end_regn_dt?.slice(0, 10) ?? item.end_date?.slice(0, 10) ?? null,
        description: `${item.title}${unpaid ? " (unpaid)" : ""}`,
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
