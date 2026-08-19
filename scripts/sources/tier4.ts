/**
 * TIER 4 — India off-campus newsletters, filtered to 2028-batch-eligible
 * internship posts. These are WordPress-style listing pages, so the parser
 * walks post permalinks and reads the company/role/location out of the title.
 */
import {
  absoluteUrl,
  decodeEntities,
  getText,
  guessLocation,
  stripTags,
  type RawRole,
  type Source,
} from "./base";

const NEWSLETTERS = [
  { id: "freshersdunia", label: "FreshersDunia — 2028 batch off-campus", url: "https://freshersdunia.in/2028-batch-off-campus/" },
  { id: "offcampusjobs4u", label: "OffCampusJobs4u — 2027 batch", url: "https://offcampusjobs4u.com/2027-batch-off-campus-jobs/" },
  { id: "enggwave", label: "EnggWave — 2027 batch", url: "https://www.enggwave.com/category/2027-batch" },
  { id: "placementofficer", label: "Placement-Officer — internships", url: "https://placement-officer.com/" },
];

/** Titles that are hub/category pages rather than an actual posting. */
const HUB_TITLE = /^(\d{4}\s+batch\s+internships?|internships?\s+for\s+\w+|internship\s+for\s+freshers|latest\s+.*)$/i;

const SPLIT_ON = /\s*[|—–:]\s*/;
const COMPANY_STOP = /\b(off\s*campus|internship|intern|hiring|recruitment|careers?|drive|jobs?|summer|is\s+hiring)\b/i;

/**
 * Trailing job-title words that leak into the company slot.
 * "Cisco Software Engineer Summer Internship" -> "Cisco".
 */
const ROLE_TAIL =
  /\s+(software|hardware|data|ai|ml|cloud|security|cyber|qa|test|testing|web|mobile|analytics|engineer|engineering|developer|development|science|scientist|analyst|design|designer|technology|technical|programme?|program)$/i;

function trimRoleWords(name: string): string {
  let out = name.trim();
  // Strip repeatedly so multi-word tails collapse, but never to nothing.
  for (let i = 0; i < 4; i++) {
    const next = out.replace(ROLE_TAIL, "").trim();
    if (next === out || next.split(/\s+/).length === 0) break;
    out = next;
  }
  return out;
}

/** Role words that are not company names. */
const GENERIC_COMPANY =
  /^(data science|data|software|machine learning|artificial intelligence|ai|ml|web|full stack|frontend|backend|cyber ?security|security|cloud|devops|python|java|remote|work from home|paid|free|latest|new|top|best|apply|online|virtual|summer|winter|govt|government|private|company|companies|multiple|various|all)$/i;

/** "Sprinklr Internship 2026 | Research Intern | Gurgaon" -> parts. */
export function parseNewsletterTitle(title: string): { company: string; role: string; location: string } | null {
  const clean = decodeEntities(title).replace(/\s+/g, " ").trim();
  if (!clean || HUB_TITLE.test(clean)) return null;

  const parts = clean.split(SPLIT_ON).map((p) => p.trim()).filter(Boolean);
  const head = parts[0] ?? clean;

  // Company = the words before the first "Internship"/"Off Campus"/"Hiring".
  const stop = head.search(COMPANY_STOP);
  let company = (stop > 0 ? head.slice(0, stop) : head).replace(/\b(20\d\d)\b/g, "").trim();
  company = trimRoleWords(company).replace(/[,\-–—]+$/, "").trim();
  if (!company || company.length > 45) return null;
  // "Data Science Intern ..." must not yield a company called "Data Science".
  if (GENERIC_COMPANY.test(company)) return null;

  // Role = the first later segment that reads like a job title, else the head.
  const roleSeg = parts.slice(1).find((p) => /intern|engineer|developer|scientist|analyst|trainee|sde|swe/i.test(p));
  const role = (roleSeg ?? head).replace(/\s+/g, " ").trim();

  const location = guessLocation(clean) ?? "India";
  return { company, role, location };
}

export function parseNewsletter(html: string, pageUrl: string): RawRole[] {
  const host = new URL(pageUrl).host;
  const out = new Map<string, RawRole>();

  for (const m of html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]{0,260}?)<\/a>/gi)) {
    const href = m[1];
    if (!href.includes(host)) continue;
    if (/\/(category|tag|page|author|feed|wp-|#)/i.test(href.replace(`https://${host}`, ""))) continue;

    const text = decodeEntities(stripTags(m[2]));
    if (!text || text.length < 18 || text.length > 170) continue;
    if (!/intern/i.test(text)) continue;

    const parsed = parseNewsletterTitle(text);
    if (!parsed) continue;

    out.set(href, {
      company: parsed.company,
      role: parsed.role,
      location: parsed.location,
      url: absoluteUrl(href, pageUrl),
      description: text,
    });
  }
  return [...out.values()];
}

export const tier4Sources: Source[] = NEWSLETTERS.map((n) => ({
  id: `newsletter:${n.id}`,
  label: n.label,
  tier: 4,
  run: async () => parseNewsletter(await getText(n.url), n.url),
}));
