import { createHash } from "node:crypto";
import type { LocationBucket } from "./types";

/** Lowercase, strip punctuation, collapse whitespace. */
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable role fingerprint = company + role + location, normalized.
 * Deliberately excludes the URL and any req id, so a company re-posting the
 * same req under a new id does not read as "newly opened".
 */
export function fingerprint(company: string, role: string, location: string): string {
  const basis = [norm(company), norm(role), norm(location)].join("|");
  return createHash("sha1").update(basis).digest("hex").slice(0, 16);
}

const CHENNAI_TOKENS = ["chennai", "madras", "sholinganallur", "siruseri", "guindy", "taramani", "omr"];
const REMOTE_TOKENS = ["remote", "work from home", "wfh", "anywhere", "virtual", "distributed"];

export function bucketLocation(location: string): LocationBucket {
  const n = norm(location);
  if (CHENNAI_TOKENS.some((t) => n.includes(t))) return "Chennai";
  if (REMOTE_TOKENS.some((t) => n.includes(t))) return "Remote";
  return "Other";
}

const INDIA_TOKENS = [
  "india", "bharat", "chennai", "bengaluru", "bangalore", "hyderabad", "pune",
  "mumbai", "delhi", "gurgaon", "gurugram", "noida", "kolkata", "ahmedabad",
  "coimbatore", "madras", "trivandrum", "thiruvananthapuram", "kochi", "cochin",
  "jaipur", "indore", "chandigarh", "mysore", "mysuru", "vizag", "visakhapatnam",
  "madurai", "nagpur", "bhubaneswar", "kanpur", "roorkee", "kharagpur", "guwahati",
];

/**
 * Countries that disqualify a listing unless India is also named.
 * Without this, "Remote - Leuven, Belgium" slips through on the remote token.
 */
const FOREIGN_TOKENS = [
  "united states", "usa", "canada", "united kingdom", "england", "scotland",
  "ireland", "germany", "france", "belgium", "netherlands", "switzerland",
  "sweden", "norway", "denmark", "finland", "spain", "italy", "portugal",
  "poland", "hungary", "romania", "czech", "austria", "greece", "turkey",
  "israel", "singapore", "japan", "china", "taiwan", "korea", "hong kong",
  "australia", "new zealand", "brazil", "mexico", "argentina", "chile",
  "colombia", "russia", "russian", "ukraine", "egypt", "south africa",
  "kenya", "nigeria", "uae", "dubai", "abu dhabi", "qatar", "saudi",
  "philippines", "vietnam", "thailand", "malaysia", "indonesia", "bangladesh",
  "sri lanka", "pakistan", "nepal", "costa rica", "peru",
  // Cities matter too: "Berlin / Remote" cleared the remote gate because only
  // "germany" was listed.
  "berlin", "munich", "hamburg", "frankfurt", "london", "manchester", "dublin",
  "amsterdam", "rotterdam", "paris", "lyon", "madrid", "barcelona", "lisbon",
  "porto", "milan", "rome", "zurich", "geneva", "vienna", "prague", "warsaw",
  "krakow", "budapest", "bucharest", "stockholm", "oslo", "copenhagen",
  "helsinki", "athens", "istanbul", "tel aviv", "new york", "san francisco",
  "seattle", "austin", "boston", "chicago", "los angeles", "san jose",
  "toronto", "vancouver", "montreal", "sydney", "melbourne", "auckland",
  "tokyo", "osaka", "seoul", "beijing", "shanghai", "shenzhen", "taipei",
  "sao paulo", "mexico city", "buenos aires", "cairo", "nairobi", "lagos",
];

/** Word-boundary test that survives norm()'s punctuation stripping. */
function hasToken(haystack: string, token: string): boolean {
  return new RegExp(`\\b${token.replace(/\s+/g, "\\s+")}\\b`).test(haystack);
}

/** True when the role is in India, or remote and not pinned to another country. */
export function isIndiaOrRemote(location: string): boolean {
  const n = norm(location);
  if (!n) return false;

  const inIndia = INDIA_TOKENS.some((t) => hasToken(n, t));
  if (inIndia) return true;

  const isRemote = REMOTE_TOKENS.some((t) => hasToken(n, t));
  if (!isRemote) return false;

  // Remote, but explicitly anchored to a country that is not India.
  return !FOREIGN_TOKENS.some((t) => hasToken(n, t));
}

const INTERN_PATTERN =
  /\b(intern|interns|internship|internships|co-?op|trainee|traineeship|apprentice|apprenticeship|summer analyst|industrial training|campus hire|research assistant|fellowship|fellow)\b/i;

/**
 * True when the title reads like an internship.
 * Uses word boundaries so "Internal Audit" and "International Sales" — both of
 * which contain "intern" as a substring — do not qualify.
 */
export function looksLikeInternship(title: string): boolean {
  return INTERN_PATTERN.test(title || "");
}

/** Tech/CS signals — he is a CSE undergrad, so non-technical interns are noise. */
const TECH_PATTERN =
  /\b(software|engineer|engineering|developer|development|programmer|data|analytics|analyst|machine learning|ml|ai|artificial intelligence|deep learning|nlp|llm|computer|cs|sde|swe|backend|back-end|frontend|front-end|full[- ]?stack|web|mobile|android|ios|cloud|devops|sre|infrastructure|platform|systems|security|cyber|qa|quality|test|automation|database|research|scientist|technology|technical|quant|quantitative|robotics|embedded|network|blockchain|ux|ui|product design)\b/i;

/** Functions he is not applying for. */
const NON_TECH_PATTERN =
  /\b(finance|financial|accounting|accountant|audit|tax|payroll|human resources|hr\b|recruit|recruiting|recruiter|talent acquisition|sales|marketing|brand|content writer|copywriter|social media|communications|public relations|legal|paralegal|compliance officer|supply chain|logistics|procurement|warehouse|customer success|customer service|customer support|business development|bd\b|administrative|admin assistant|office|facilities|nursing|clinical|pharma|teaching|tutor)\b/i;

/**
 * Tokens strong enough to rescue a title that also reads as non-technical.
 * Deliberately excludes weak words like "analyst" and "data" on their own —
 * otherwise "Financial Analyst Intern" rescues itself.
 */
const STRONG_TECH_PATTERN =
  /\b(software|engineer|engineering|developer|development|programmer|programming|computer|sde|swe|data scien|data engineer|machine learning|deep learning|artificial intelligence|ai|ml|nlp|llm|backend|back-end|frontend|front-end|full[- ]?stack|web|mobile|android|ios|cloud|devops|sre|infrastructure|platform|systems|security|cyber|qa|test|automation|database|robotics|embedded|network|blockchain|research|scientist|technical|quant)\b/i;

/**
 * Functions and disciplines no tech keyword can rescue — "Business Development
 * Representative" would otherwise survive on the word "development", and a
 * mechanical internship is not a CSE role however it is described.
 */
const HARD_BLOCK_PATTERN =
  /\b(business development|sales|marketing|brand|human resources|recruit(ing|er|ment)?|talent acquisition|customer (success|service|support)|public relations|legal|paralegal|accounting|accountant|payroll|tax|audit|mechanical|civil|chemical|biotech|biomedical|pharma|nursing|clinical|operations management|inventory|procurement|logistics|warehouse|project manager|program manager|delivery manager|scrum master|technical writer|content (developer|writer|strategist)|copywriter|tech(nical)? support|help ?desk|service desk|facilities|community manager|event|ux|ui|user experience|user interface|graphic design|product design|hardware|firmware|vlsi|rtl|asic|fpga)\b/i;

/**
 * The only three families worth surfacing: AI/ML, data science & analytics,
 * and software development. Anything else — UX, manual QA, networking,
 * hardware, IT support — is out, however technical it sounds.
 */
export type RoleCategory = "ai-ml" | "data" | "swe";

const CATEGORY_PATTERNS: Array<[RoleCategory, RegExp]> = [
  [
    "ai-ml",
    /\b(a\.?i\.?|artificial intelligence|machine learning|\bml\b|mlops|deep learning|neural|nlp|natural language|llm|large language|generative|gen ?ai|computer vision|multimodal|reinforcement learning|recommendation|applied scien(ce|tist)|research scien(ce|tist)|ml engineer|ai engineer|prompt|rag\b|agentic)\b/i,
  ],
  [
    "data",
    /\b(data scien(ce|tist)|data analy(st|tics)|data engineer(ing)?|analytics engineer|business intelligence|\bbi\b|big data|etl|elt|data warehouse|data platform|data pipeline|quantitative (research|analyst|developer)|quant (research|developer|analyst)|statistic(s|al)|econometric)\b/i,
  ],
  [
    "swe",
    /\b(software (developer|development|engineer(ing)?)|\bsde\b|\bswe\b|sdet|software development engineer|full[- ]?stack|back ?end|front ?end|web develop(er|ment)|mobile develop(er|ment)|android|ios developer|application (developer|engineer)|platform engineer|cloud engineer|devops|\bsre\b|site reliability|infrastructure engineer|systems engineer|api engineer|test automation|automation engineer|programmer|python develop|java develop|javascript|react|node\.?js|golang|\bgo developer\b|product engineer|technology analyst)\b/i,
  ],
];

/** Which of the three families a role belongs to, or null if none. */
export function roleCategory(title: string, description?: string | null): RoleCategory | null {
  const name = title || "";
  if (HARD_BLOCK_PATTERN.test(name)) return null;
  if (NON_TECH_PATTERN.test(name) && !STRONG_TECH_PATTERN.test(name)) return null;

  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(name)) return cat;

  // Only consult the description when the title says nothing useful ("Paid
  // Internship", "Summer Intern"). Reading the JD for any title let a
  // "UX Design Intern" whose JD mentioned AI get filed under AI/ML.
  const stripped = name
    .replace(/\b(20\d{2}|batch|hiring|apply|now|off[\s-]?campus|opportunity|programme?)\b/gi, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const uninformative = /^(paid|summer|winter|spring|fall|new)?\s*intern(ship)?s?$/i.test(stripped);
  if (!uninformative) return null;

  const text = `${name} ${description ?? ""}`;
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(text)) return cat;
  return null;
}

/**
 * Keep a role when it lands in one of the three families.
 * (Kept as a predicate so the scan reads plainly.)
 */
export function isRelevantDiscipline(title: string, description?: string | null): boolean {
  return roleCategory(title, description) !== null;
}

/** Parse a stipend out of free text, returning the raw matched string. */
export function extractStipend(text: string | null | undefined): string | null {
  if (!text) return null;
  const patterns = [
    // \brs\b matters: without it "Freshers 2026" yields a bogus "rs 2026".
    /(?:₹|\brs\.?\b|\binr\b)\s?[\d,]+(?:\s?(?:-|–|to)\s?(?:₹|rs\.?|inr)?\s?[\d,]+)?\s*(?:\/\s*)?(?:per\s+)?(?:month|mo|pm|year|annum|week)?/i,
    /\$\s?[\d,]+(?:\s?(?:-|–|to)\s?\$?\s?[\d,]+)?\s*(?:\/\s*)?(?:per\s+)?(?:month|mo|hour|hr|year)?/i,
    /\b[\d,]+\s?(?:k|lpa)\b(?:\s*(?:\/|per)\s*(?:month|year|annum))?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const s = m[0].replace(/\s+/g, " ").trim();
    if (!/\d/.test(s)) continue;

    // A lone 4-digit year is a date, not a stipend.
    const digits = s.replace(/[^\d]/g, "");
    const hasPeriod = /month|mo\b|year|annum|week|hour|hr\b|pm\b|lpa|k\b/i.test(s);
    if (!hasPeriod && /^(19|20)\d{2}$/.test(digits)) continue;

    return s;
  }
  return null;
}

/** Find an explicit deadline date in free text. */
export function extractDeadline(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(
    /(?:apply\s+by|last\s+date|deadline|closes?\s+on|closing\s+date)\D{0,20}(\d{1,2})[\s\-/](\w{3,9}|\d{1,2})[\s\-/](\d{2,4})/i,
  );
  if (!m) return null;
  const parsed = new Date(`${m[1]} ${m[2]} ${m[3]}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Today's date in IST. Everything here is India-facing — the scan runs at
 * 06:00 IST and the applied-date is his own application log — so a UTC stamp
 * would mislabel anything between midnight and 05:30 IST as the previous day.
 */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** ISO week label, e.g. 2026-W34. */
export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Monday 00:00 UTC of the ISO week containing `d`. */
export function weekStart(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 1);
  return date;
}
