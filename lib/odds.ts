import type { Odds } from "./types";
import {
  DEFAULT_LEAD_WITH,
  EXCLUDED_COMPANIES,
  EXCLUDED_FT_DRIVES,
  EXCLUDED_PROGRAMS,
  LEAD_WITH,
  TIER1_COMPANIES,
  UNPAID_SIGNALS,
} from "./profile";
import { bucketLocation, norm } from "./normalize";

/** Skills the profile can genuinely claim depth in. */
const STRENGTHS: Array<{ label: string; weight: number; keywords: string[] }> = [
  { label: "LLM / RAG / agents (WEB PILOT, SEVA, 4 papers)", weight: 16, keywords: ["llm", "large language model", "rag", "retrieval augmented", "genai", "generative ai", "agent", "agentic", "prompt", "foundation model", "transformer"] },
  { label: "Full-stack React/Next.js/TS (PDS Global, production)", weight: 13, keywords: ["react", "next.js", "nextjs", "typescript", "javascript", "full stack", "fullstack", "full-stack", "frontend", "front end", "web"] },
  { label: "Python / FastAPI backend", weight: 11, keywords: ["python", "fastapi", "django", "flask", "backend", "back end", "api", "microservice"] },
  { label: "Data science / analytics (K Labs, real govt data)", weight: 11, keywords: ["data science", "data scientist", "analytics", "machine learning", "ml", "statistics", "pandas", "sql"] },
  { label: "Data platform / DuckDB / query engines (strata)", weight: 10, keywords: ["duckdb", "data platform", "data engineering", "warehouse", "etl", "pipeline", "olap", "database", "query"] },
  { label: "PyTorch / deep learning", weight: 10, keywords: ["pytorch", "deep learning", "neural", "training", "fine-tun", "model"] },
  { label: "Security / adversarial ML (SEVA)", weight: 9, keywords: ["security", "adversarial", "red team", "safety", "robustness", "privacy"] },
  { label: "Computer vision / document AI (FORENSIQ 99.2%)", weight: 8, keywords: ["computer vision", "ocr", "document", "image", "multimodal", "vision"] },
  { label: "Java", weight: 6, keywords: ["java", "spring"] },
  { label: "UI/UX (INTECHGRID)", weight: 5, keywords: ["ui", "ux", "design system", "figma", "product design"] },
];

/** Requirements he does not meet. Each drags the score down hard. */
const MISMATCHES: Array<{ label: string; penalty: number; keywords: string[] }> = [
  { label: "Wants a PhD / MS candidate", penalty: 34, keywords: ["phd", "ph.d", "doctoral", "masters student", "ms candidate", "graduate student"] },
  { label: "Low-level systems / hardware focus (outside his stack)", penalty: 18, keywords: ["verilog", "vhdl", "rtl", "asic", "fpga", "silicon", "analog", "vlsi", "soc design", "firmware", "embedded c", "device driver", "kernel"] },
  { label: "Heavy C++ / HFT systems requirement", penalty: 14, keywords: ["c++", "cpp", "low latency", "hft", "kernel bypass"] },
  { label: "Needs prior industry experience", penalty: 12, keywords: ["3+ years", "5+ years", "2+ years", "years of experience", "experienced professional"] },
  { label: "Non-CS discipline", penalty: 22, keywords: ["mechanical", "civil", "chemical", "biotech", "pharma", "marketing", "sales", "human resources", "recruiting", "finance analyst", "accounting", "legal"] },
];

const BAR_PENALTY: Record<string, number> = { extreme: 26, high: 15, medium: 6 };

const TIER1_INDEX = new Map(TIER1_COMPANIES.map((c) => [norm(c.name), c]));

export interface OddsInput {
  company: string;
  role: string;
  location: string;
  description?: string | null;
  stipend?: string | null;
}

export interface OddsResult {
  odds: Odds;
  score: number;
  reasons: string[];
}

/**
 * Score a role 0-100 for this specific candidate.
 * Base 50, adjusted by skill fit, company selectivity, location and mismatches.
 */
export function rateOdds(input: OddsInput): OddsResult {
  const haystack = norm(`${input.role} ${input.description ?? ""}`);
  const reasons: string[] = [];
  let score = 50;

  // Skill fit — only the two strongest matches count, so keyword-stuffed
  // descriptions cannot inflate the score.
  const hits = STRENGTHS.filter((s) => s.keywords.some((k) => haystack.includes(k)))
    .sort((a, b) => b.weight - a.weight);
  for (const hit of hits.slice(0, 2)) {
    score += hit.weight;
    reasons.push(`+ ${hit.label}`);
  }
  if (hits.length === 0) {
    score -= 8;
    reasons.push("- No direct overlap with his core stack");
  }

  // Company selectivity.
  const t1 = TIER1_INDEX.get(norm(input.company));
  if (t1) {
    score -= BAR_PENALTY[t1.bar];
    if (t1.bar === "extreme") reasons.push(`- ${t1.name} runs an extremely selective process`);
    else if (t1.bar === "high") reasons.push(`- ${t1.name} has a high hiring bar`);
    else reasons.push(`- ${t1.name} is competitive but reachable`);
    if (t1.kind === "quant") {
      reasons.push("- Quant desks screen hard on competitive programming / C++");
    }
  }

  // Location.
  const bucket = bucketLocation(input.location);
  if (bucket === "Chennai") {
    score += 10;
    reasons.push("+ Chennai — home city, no relocation friction");
  } else if (bucket === "Remote") {
    score += 6;
    reasons.push("+ Remote-friendly");
  }

  // Mismatches.
  for (const m of MISMATCHES) {
    if (m.keywords.some((k) => haystack.includes(k))) {
      score -= m.penalty;
      reasons.push(`- ${m.label}`);
    }
  }

  // Research roles reward his publication record.
  if (/research|scientist|publication|paper|fellowship/.test(haystack)) {
    score += 12;
    reasons.push("+ 4 papers (SEVA, Calibration at Scale) carry weight for research roles");
  }

  // Strong academics help where CGPA cutoffs exist.
  if (/cgpa|gpa|percentile|academic/.test(haystack)) {
    score += 6;
    reasons.push("+ CGPA 9.15 clears typical cutoffs");
  }

  // A named stipend is a signal the listing is a real paid role.
  if (input.stipend) {
    score += 3;
    reasons.push("+ Paid role with a stated stipend");
  }

  score = Math.max(2, Math.min(98, Math.round(score)));
  const odds: Odds = score >= 65 ? "Strong" : score >= 40 ? "Moderate" : "Reach";
  return { odds, score, reasons };
}

/** Pick which project to headline in the application. */
export function pickLeadWith(role: string, description?: string | null): { tag: string; project: string } {
  const haystack = norm(`${role} ${description ?? ""}`);
  let best: { tag: string; project: string; score: number } | null = null;
  for (const entry of LEAD_WITH) {
    const score = entry.keywords.reduce((acc, k) => (haystack.includes(k) ? acc + k.length : acc), 0);
    if (score > 0 && (!best || score > best.score)) {
      best = { tag: entry.tag, project: entry.project, score };
    }
  }
  return best ? { tag: best.tag, project: best.project } : DEFAULT_LEAD_WITH;
}

/**
 * Hard exclusions. Returns the reason string when the role must be dropped.
 */
export function exclusionReason(company: string, role: string, description?: string | null): string | null {
  const co = norm(company);
  const combined = norm(`${company} ${role} ${description ?? ""}`);

  for (const bad of EXCLUDED_COMPANIES) {
    if (co.includes(norm(bad)) || combined.includes(norm(bad))) return `fee-charging mill: ${bad}`;
  }
  for (const bad of EXCLUDED_PROGRAMS) {
    if (combined.includes(norm(bad))) return `aged out of program: ${bad}`;
  }
  for (const bad of EXCLUDED_FT_DRIVES) {
    if (combined.includes(norm(bad))) return `ineligible fresher/FT drive: ${bad}`;
  }
  for (const bad of UNPAID_SIGNALS) {
    if (combined.includes(norm(bad))) return `unpaid / certificate-only: ${bad}`;
  }

  // Drives explicitly dated to a past year are closed by the time he sees them.
  const currentYear = new Date().getFullYear();
  const years = [...`${company} ${role}`.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  if (years.length && years.every((y) => y < currentYear)) {
    return `stale drive dated ${Math.max(...years)}`;
  }

  return null;
}
