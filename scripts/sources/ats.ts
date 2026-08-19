/**
 * Generic adapters for the ATS platforms these companies actually run on.
 * Each returns RawRole[]; filtering to India/remote + internships happens
 * centrally in scan.ts so every source is treated identically.
 */
import { getJson, postJson, stripTags, type RawRole } from "./base";

/* ------------------------------------------------------------------ Workday */

interface WorkdayPosting {
  title: string;
  externalPath: string;
  locationsText: string;
  postedOn: string;
  bulletFields?: string[];
}

interface WorkdayResponse {
  total: number;
  jobPostings: WorkdayPosting[];
}

export interface WorkdayTenant {
  company: string;
  tenant: string;
  cluster: string; // wd1, wd5, wd12...
  site: string;
}

/** "Posted 3 Days Ago" | "Posted Today" | "Posted 30+ Days Ago" -> ISO date. */
function workdayPostedOn(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const d = new Date();
  if (t.includes("today")) return d.toISOString().slice(0, 10);
  if (t.includes("yesterday")) {
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const m = t.match(/(\d+)\+?\s*(day|week|month)/);
  if (!m) return null;
  const n = Number(m[1]);
  const days = m[2] === "day" ? n : m[2] === "week" ? n * 7 : n * 30;
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

interface WorkdayNode {
  facetParameter?: string;
  descriptor?: string;
  id?: string;
  count?: number;
  values?: WorkdayNode[];
}

interface FacetCandidate {
  param: string;
  ids: string[];
  exact: boolean;
}

/**
 * Workday's free-text relevance is too weak to surface India intern reqs
 * (a keyword sweep for "intern" on Salesforce returns zero of them), so the
 * scan filters by the tenant's India location facet instead.
 *
 * The facet tree is nested and the applicable `facetParameter` lives on an
 * inner node — on NVIDIA the India value sits under `locationMainGroup` but
 * must be applied as `locationHierarchy1`. So walk the tree, inherit the
 * nearest parameter, and validate each candidate against the API before
 * trusting it.
 */
function collectFacetCandidates(
  nodes: WorkdayNode[],
  inherited: string | undefined,
  acc: Map<string, { exact: string[]; prefix: string[] }>,
): void {
  for (const node of nodes) {
    const param = node.facetParameter ?? inherited;
    const descriptor = node.descriptor ?? "";
    if (node.id && param && /^india\b/i.test(descriptor)) {
      const entry = acc.get(param) ?? { exact: [], prefix: [] };
      if (/^india$/i.test(descriptor)) entry.exact.push(node.id);
      else entry.prefix.push(node.id);
      acc.set(param, entry);
    }
    if (node.values?.length) collectFacetCandidates(node.values, param, acc);
  }
}

async function discoverIndiaFacet(api: string): Promise<FacetCandidate | null> {
  const res = await postJson<WorkdayResponse & { facets?: WorkdayNode[] }>(api, {
    appliedFacets: {},
    limit: 20,
    offset: 0,
    searchText: "",
  });

  const acc = new Map<string, { exact: string[]; prefix: string[] }>();
  collectFacetCandidates(res.facets ?? [], undefined, acc);

  // A single "India" id beats a pile of "India, <city>" ids.
  const candidates: FacetCandidate[] = [];
  for (const [param, { exact }] of acc) {
    if (exact.length) candidates.push({ param, ids: exact, exact: true });
  }
  for (const [param, { prefix }] of acc) {
    if (prefix.length) candidates.push({ param, ids: prefix.slice(0, 25), exact: false });
  }

  for (const candidate of candidates) {
    try {
      const probe = await postJson<WorkdayResponse>(api, {
        appliedFacets: { [candidate.param]: candidate.ids },
        limit: 20,
        offset: 0,
        searchText: "",
      });
      if ((probe.jobPostings ?? []).length > 0) return candidate;
    } catch {
      // Wrong parameter for this tenant — try the next candidate.
    }
  }
  return null;
}

export async function fetchWorkday(t: WorkdayTenant): Promise<RawRole[]> {
  const base = `https://${t.tenant}.${t.cluster}.myworkdayjobs.com`;
  const api = `${base}/wday/cxs/${t.tenant}/${t.site}/jobs`;
  const out = new Map<string, RawRole>();

  const collect = (postings: WorkdayPosting[]) => {
    for (const p of postings) {
      if (!p.externalPath) continue;
      const url = `${base}/en-US/${t.site}${p.externalPath}`;
      out.set(url, {
        company: t.company,
        role: p.title,
        location: p.locationsText ?? "",
        url,
        postedAt: workdayPostedOn(p.postedOn),
        description: p.title,
      });
    }
  };

  let facet: FacetCandidate | null = null;
  try {
    facet = await discoverIndiaFacet(api);
  } catch {
    facet = null;
  }

  if (facet) {
    // India-only listing: walk the whole country result set.
    const applied = { [facet.param]: facet.ids };
    try {
      // Workday reports `total` only on the first page; later pages send 0.
      let total = Infinity;
      for (let page = 0; page < 30; page++) {
        const res = await postJson<WorkdayResponse>(api, {
          appliedFacets: applied,
          limit: 20,
          offset: page * 20,
          searchText: "",
        });
        if (page === 0 && typeof res.total === "number" && res.total > 0) total = res.total;
        const postings = res.jobPostings ?? [];
        collect(postings);
        if (postings.length < 20 || (page + 1) * 20 >= total) break;
      }
    } catch {
      // Keep whatever paged in before the failure and fall through below.
    }
    if (out.size > 0) return [...out.values()];
  }

  // Fallback: keyword sweep when no country facet is exposed.
  for (const searchText of ["intern", "internship", "student"]) {
    let total = Infinity;
    for (let page = 0; page < 8; page++) {
      const res = await postJson<WorkdayResponse>(api, {
        appliedFacets: {},
        limit: 20,
        offset: page * 20,
        searchText,
      });
      if (page === 0 && typeof res.total === "number" && res.total > 0) total = res.total;
      const postings = res.jobPostings ?? [];
      collect(postings);
      if (postings.length < 20 || (page + 1) * 20 >= total) break;
    }
  }
  return [...out.values()];
}

/* --------------------------------------------------------------- Greenhouse */

interface GreenhouseJob {
  id: number;
  title: string;
  location?: { name?: string };
  absolute_url: string;
  updated_at?: string;
  content?: string;
}

export async function fetchGreenhouse(company: string, board: string): Promise<RawRole[]> {
  const res = await getJson<{ jobs: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
  );
  return (res.jobs ?? []).map((j) => ({
    company,
    role: j.title,
    location: j.location?.name ?? "",
    url: j.absolute_url,
    postedAt: j.updated_at ? j.updated_at.slice(0, 10) : null,
    description: j.content ? stripTags(j.content).slice(0, 1200) : j.title,
  }));
}

/* -------------------------------------------------------------------- Lever */

interface LeverPost {
  text: string;
  hostedUrl: string;
  createdAt?: number;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
}

export async function fetchLever(company: string, board: string): Promise<RawRole[]> {
  const res = await getJson<LeverPost[]>(`https://api.lever.co/v0/postings/${board}?mode=json`);
  return (res ?? []).map((p) => ({
    company,
    role: p.text,
    location: p.categories?.location ?? "",
    url: p.hostedUrl,
    postedAt: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null,
    description: (p.descriptionPlain ?? p.text).slice(0, 1200),
  }));
}

/* -------------------------------------------------------------------- Ashby */

interface AshbyJob {
  title: string;
  location?: string;
  jobUrl: string;
  publishedAt?: string;
  descriptionPlain?: string;
  isRemote?: boolean;
}

export async function fetchAshby(company: string, board: string): Promise<RawRole[]> {
  const res = await getJson<{ jobs: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${board}`,
  );
  return (res.jobs ?? []).map((j) => ({
    company,
    role: j.title,
    location: j.location ?? (j.isRemote ? "Remote" : ""),
    url: j.jobUrl,
    postedAt: j.publishedAt ? j.publishedAt.slice(0, 10) : null,
    description: (j.descriptionPlain ?? j.title).slice(0, 1200),
  }));
}

/* ----------------------------------------------------------- SmartRecruiters */

interface SmartRecruitersPosting {
  id: string;
  name: string;
  releasedDate?: string;
  location?: { city?: string; region?: string; country?: string; remote?: boolean };
  company?: { identifier?: string };
}

export async function fetchSmartRecruiters(company: string, identifier: string): Promise<RawRole[]> {
  const res = await getJson<{ content: SmartRecruitersPosting[] }>(
    `https://api.smartrecruiters.com/v1/companies/${identifier}/postings?limit=100`,
  );
  return (res.content ?? []).map((p) => {
    const loc = [p.location?.city, p.location?.region, p.location?.country]
      .filter(Boolean)
      .join(", ");
    return {
      company,
      role: p.name,
      location: p.location?.remote ? `Remote${loc ? ` (${loc})` : ""}` : loc,
      url: `https://jobs.smartrecruiters.com/${identifier}/${p.id}`,
      postedAt: p.releasedDate ? p.releasedDate.slice(0, 10) : null,
      description: p.name,
    };
  });
}

/* ------------------------------------------------------------------- Amazon */

interface AmazonJob {
  title: string;
  job_path: string;
  normalized_location?: string;
  location?: string;
  posted_date?: string;
  description?: string;
  basic_qualifications?: string;
  is_intern?: boolean;
}

export async function fetchAmazon(): Promise<RawRole[]> {
  const out = new Map<string, RawRole>();
  for (const query of ["intern", "internship", "SDE intern"]) {
    const res = await getJson<{ jobs: AmazonJob[] }>(
      `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(query)}` +
        `&loc_query=India&country=IND&result_limit=100&sort=recent`,
    );
    for (const j of res.jobs ?? []) {
      const url = `https://www.amazon.jobs${j.job_path}`;
      out.set(url, {
        company: "Amazon",
        role: j.title,
        location: j.normalized_location ?? j.location ?? "",
        url,
        postedAt: j.posted_date ? safeDate(j.posted_date) : null,
        description: `${j.description ?? ""} ${j.basic_qualifications ?? ""}`.slice(0, 1500),
      });
    }
  }
  return [...out.values()];
}

function safeDate(s: string): string | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/* ---------------------------------------------- Oracle Recruiting (JPMorgan) */

interface OracleReq {
  Id: string;
  Title: string;
  PostedDate?: string;
  PostingEndDate?: string | null;
  PrimaryLocation?: string;
  PrimaryLocationCountry?: string;
  ShortDescriptionStr?: string;
  ExternalQualificationsStr?: string;
}

export async function fetchOracleRecruiting(
  company: string,
  host: string,
  siteNumber: string,
  keywords = ["intern", "summer analyst"],
): Promise<RawRole[]> {
  const out = new Map<string, RawRole>();
  for (const keyword of keywords) {
    const url =
      `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true` +
      `&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${siteNumber},` +
      `limit=200,keyword=${encodeURIComponent(keyword)},sortBy=POSTING_DATES_DESC`;
    const res = await getJson<{ items: Array<{ requisitionList?: OracleReq[] }> }>(url);
    for (const req of res.items?.[0]?.requisitionList ?? []) {
      const link = `https://${host}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${req.Id}`;
      out.set(link, {
        company,
        role: req.Title,
        location: req.PrimaryLocation ?? req.PrimaryLocationCountry ?? "",
        url: link,
        postedAt: req.PostedDate ?? null,
        deadline: req.PostingEndDate ? req.PostingEndDate.slice(0, 10) : null,
        description: stripTags(
          `${req.ShortDescriptionStr ?? ""} ${req.ExternalQualificationsStr ?? ""}`,
        ).slice(0, 1500),
      });
    }
  }
  return [...out.values()];
}
