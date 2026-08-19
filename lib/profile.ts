/**
 * Single source of truth for "who is this scanner rating roles for".
 * Editing this file changes the odds engine and the lead-with tags.
 */

export const PROFILE = {
  name: "Varadharajan V",
  github: "https://github.com/varadharajanv0310",
  degree: "B.Tech CSE",
  college: "SRM IST Chennai",
  batch: "2024-2028",
  gradYear: 2028,
  cgpa: 9.15,
  /** Penultimate year in the 2026-27 academic year -> Summer 2027 internships. */
  targetSeason: "Summer 2027",
  homeCity: "Chennai",
  internships: [
    "PDS Global — SDE, full-stack LEAD (production fintech, Next.js/TS)",
    "K Labs — Data Science (real Tamil Nadu govt data)",
    "INTECHGRID — UI/UX",
  ],
  research: [
    "Calibration at Scale",
    "LLM Testing",
    "SEVA (RAG adversarial attack + defense)",
    "+1 under review",
  ],
  projects: [
    "strata (FastAPI/DuckDB/React/local-LLM)",
    "WEB PILOT (voice agentic browser agent, Bhashini)",
    "FORENSIQ (doc-forgery detection, 99.2%)",
    "Sevai-Scout (Tamil/English govt-schemes)",
  ],
  achievement: "Smart India Hackathon — Top 40 of 1,500+",
  skills: [
    "Python", "Java", "JavaScript", "TypeScript", "FastAPI", "React", "Next.js",
    "LLMs", "RAG", "agents", "PyTorch", "SQL", "DuckDB",
  ],
} as const;

/** tag -> { project to headline, matching keywords } */
export const LEAD_WITH: Array<{
  tag: string;
  project: string;
  keywords: string[];
}> = [
  {
    tag: "agentic-AI",
    project: "WEB PILOT (voice agentic browser agent, Bhashini)",
    keywords: ["agent", "agentic", "autonomous", "browser automation", "tool use", "copilot", "assistant", "voice", "speech", "multi-agent", "orchestration"],
  },
  {
    tag: "data-platform",
    project: "strata (FastAPI/DuckDB/React/local-LLM)",
    keywords: ["data platform", "data engineer", "data infrastructure", "analytics engineer", "warehouse", "duckdb", "spark", "etl", "elt", "pipeline", "olap", "query engine", "database", "big data"],
  },
  {
    tag: "security",
    project: "SEVA (RAG adversarial attack + defense)",
    keywords: ["security", "adversarial", "red team", "safety", "trust and safety", "threat", "vulnerability", "appsec", "infosec", "privacy", "abuse", "fraud detection", "robustness"],
  },
  {
    tag: "Indic/social",
    project: "Sevai-Scout (Tamil/English govt-schemes)",
    keywords: ["indic", "multilingual", "localization", "vernacular", "bhashini", "tamil", "hindi", "social impact", "public sector", "govtech", "civic", "ai for good", "development sector"],
  },
  {
    tag: "doc-AI",
    project: "FORENSIQ (doc-forgery detection, 99.2%)",
    keywords: ["document", "ocr", "computer vision", "forgery", "kyc", "identity", "extraction", "idp", "vision", "multimodal", "image"],
  },
  {
    tag: "fullstack/fintech",
    project: "PDS Global — production fintech full-stack lead (Next.js/TS)",
    keywords: ["full stack", "fullstack", "full-stack", "frontend", "front end", "backend", "back end", "web developer", "react", "next.js", "typescript", "node", "fintech", "payments", "banking", "api", "microservice", "product engineer"],
  },
  {
    tag: "DS",
    project: "K Labs (real Tamil Nadu govt data) + strata",
    keywords: ["data science", "data scientist", "analytics", "statistics", "quantitative", "forecasting", "experimentation", "business intelligence", "insight"],
  },
  {
    tag: "research",
    project: "SEVA + Calibration at Scale (4 papers)",
    keywords: ["research", "scientist", "publication", "nlp", "machine learning", "deep learning", "foundation model", "llm", "calibration", "evaluation", "benchmark", "research assistant", "fellowship"],
  },
];

export const DEFAULT_LEAD_WITH = {
  tag: "fullstack/fintech",
  project: "PDS Global — production fintech full-stack lead (Next.js/TS)",
};

/**
 * TIER 1 priority list. Entries with a live adapter (see scripts/sources)
 * are scanned every run. The rest have no free public JSON endpoint that
 * survives a headless runner, so they are surfaced as watchlist deep-links
 * and picked up indirectly through tier-2 trackers and tier-4 newsletters.
 */
export interface Tier1Company {
  name: string;
  /** Selectivity weight used by the odds engine (higher = harder). */
  bar: "extreme" | "high" | "medium";
  kind: "bigtech" | "quant" | "finance" | "enterprise";
  /** True when a live adapter scans this company directly. */
  live: boolean;
  watchUrl: string;
}

export const TIER1_COMPANIES: Tier1Company[] = [
  { name: "Amazon", bar: "high", kind: "bigtech", live: true, watchUrl: "https://www.amazon.jobs/en/search?base_query=intern&loc_query=India" },
  { name: "Google", bar: "extreme", kind: "bigtech", live: false, watchUrl: "https://www.google.com/about/careers/applications/jobs/results/?q=intern&location=India" },
  { name: "Microsoft", bar: "high", kind: "bigtech", live: true, watchUrl: "https://jobs.careers.microsoft.com/global/en/search?q=intern&lc=India" },
  { name: "Salesforce", bar: "high", kind: "bigtech", live: true, watchUrl: "https://careers.salesforce.com/en/jobs/?search=intern&country=India" },
  { name: "Wells Fargo", bar: "medium", kind: "finance", live: false, watchUrl: "https://www.wellsfargojobs.com/en/jobs/?search=intern&country=India" },
  { name: "Cisco", bar: "high", kind: "bigtech", live: false, watchUrl: "https://jobs.cisco.com/jobs/SearchJobs/intern?listFilterMode=1" },
  { name: "NVIDIA", bar: "extreme", kind: "bigtech", live: true, watchUrl: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite" },
  { name: "Adobe", bar: "high", kind: "bigtech", live: true, watchUrl: "https://careers.adobe.com/us/en/search-results?keywords=intern" },
  { name: "Apple", bar: "extreme", kind: "bigtech", live: false, watchUrl: "https://jobs.apple.com/en-in/search?location=india-INDC" },
  { name: "Intel", bar: "high", kind: "bigtech", live: true, watchUrl: "https://jobs.intel.com/en/search-jobs/intern/India" },
  { name: "Qualcomm", bar: "high", kind: "bigtech", live: false, watchUrl: "https://careers.qualcomm.com/careers?query=intern&location=India" },
  { name: "Uber", bar: "extreme", kind: "bigtech", live: false, watchUrl: "https://www.uber.com/us/en/careers/list/?query=intern&location=IND" },
  { name: "PayPal", bar: "high", kind: "bigtech", live: true, watchUrl: "https://paypal.wd1.myworkdayjobs.com/jobs" },
  { name: "Target", bar: "medium", kind: "enterprise", live: true, watchUrl: "https://target.wd5.myworkdayjobs.com/targetcareers" },
  { name: "IBM", bar: "medium", kind: "enterprise", live: false, watchUrl: "https://www.ibm.com/careers/search?q=intern" },
  { name: "Snowflake", bar: "high", kind: "bigtech", live: false, watchUrl: "https://careers.snowflake.com/us/en/search-results?keywords=intern" },
  { name: "SAP", bar: "medium", kind: "enterprise", live: true, watchUrl: "https://jobs.sap.com/search/?q=intern&locationsearch=India" },
  { name: "ServiceNow", bar: "high", kind: "enterprise", live: false, watchUrl: "https://careers.servicenow.com/careers/jobs/?search=intern" },
  { name: "Goldman Sachs", bar: "extreme", kind: "finance", live: false, watchUrl: "https://higher.gs.com/roles?page=1&sort=RELEVANCE" },
  { name: "D. E. Shaw", bar: "extreme", kind: "quant", live: false, watchUrl: "https://www.deshawindia.com/recruit/jobs/Adv/index.html" },
  { name: "JPMorgan", bar: "high", kind: "finance", live: true, watchUrl: "https://careers.jpmorgan.com/global/en/students/programs" },
  { name: "Morgan Stanley", bar: "high", kind: "finance", live: true, watchUrl: "https://ms.wd5.myworkdayjobs.com/External" },
  { name: "Tower Research", bar: "extreme", kind: "quant", live: true, watchUrl: "https://www.tower-research.com/open-positions/" },
  { name: "Graviton", bar: "extreme", kind: "quant", live: true, watchUrl: "https://www.gravitontrading.com/careers.html" },
  { name: "Quadeye", bar: "extreme", kind: "quant", live: false, watchUrl: "https://www.quadeye.com/careers" },
  { name: "AlphaGrep", bar: "extreme", kind: "quant", live: true, watchUrl: "https://www.alpha-grep.com/careers" },
  { name: "Optiver", bar: "extreme", kind: "quant", live: true, watchUrl: "https://optiver.com/working-at-optiver/career-opportunities/" },
  { name: "IMC", bar: "extreme", kind: "quant", live: true, watchUrl: "https://careers.imc.com/us/en/search-results" },
];

/** Never surface these — fee-charging mills and certificate shops. */
export const EXCLUDED_COMPANIES = [
  "tsteps", "t-steps", "kaashiv", "kaashivinfotech", "top tech developers",
  "toptechdevelopers", "internpe", "codsoft", "oasis infobyte", "cognifyz",
];

/** Programs he has aged out of. */
export const EXCLUDED_PROGRAMS = [
  "step intern", "student training in engineering program", "microsoft explore",
  "explore intern", "explore program", "google step",
];

/** 2026-batch fresher / full-time drives he is not eligible for. */
export const EXCLUDED_FT_DRIVES = [
  "genc", "gen c", "hcl get", "graduate engineer trainee",
  "ramco graduate", "chargebee graduate",
  "fresher hiring", "campus hiring 2026", "2026 batch", "2025 batch",
  "management trainee", "gate 2026",
];

/** Unpaid / certificate-mill signals. */
export const UNPAID_SIGNALS = [
  "unpaid", "no stipend", "certificate only", "experience certificate",
  "volunteer intern", "self-sponsored", "registration fee", "course fee",
];
