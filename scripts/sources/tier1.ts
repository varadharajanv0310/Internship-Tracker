/**
 * TIER 1 — Big-tech & quant ATS sweep.
 * Every entry here hits a public, key-free endpoint that works from a
 * headless GitHub Actions runner. Companies on the priority list without such
 * an endpoint live in lib/profile.ts as watchlist deep-links and are picked up
 * through tier 2 (trackers) and tier 4 (newsletters) instead.
 */
import {
  fetchAmazon,
  fetchGreenhouse,
  fetchOracleRecruiting,
  fetchSuccessFactors,
  fetchWorkday,
  type WorkdayTenant,
} from "./ats";
import type { Source } from "./base";

const WORKDAY_TENANTS: WorkdayTenant[] = [
  { company: "Salesforce", tenant: "salesforce", cluster: "wd12", site: "External_Career_Site" },
  { company: "NVIDIA", tenant: "nvidia", cluster: "wd5", site: "NVIDIAExternalCareerSite" },
  { company: "Adobe", tenant: "adobe", cluster: "wd5", site: "external_experienced" },
  { company: "Intel", tenant: "intel", cluster: "wd1", site: "External" },
  { company: "PayPal", tenant: "paypal", cluster: "wd1", site: "jobs" },
  { company: "Target", tenant: "target", cluster: "wd5", site: "targetcareers" },
  { company: "Morgan Stanley", tenant: "ms", cluster: "wd5", site: "External" },
];

const GREENHOUSE_BOARDS: Array<{ company: string; board: string }> = [
  { company: "Tower Research", board: "towerresearchcapital" },
  { company: "IMC", board: "imc" },
  { company: "Optiver", board: "optiver" },
  { company: "Graviton", board: "gravitonresearchcapital" },
  { company: "AlphaGrep", board: "alphagrepsecurities" },
];

/** Companies already covered here, so discovery does not scan them twice. */
export const TIER1_HARDCODED_COMPANIES = [
  "Amazon",
  "JPMorgan",
  "SAP",
  ...WORKDAY_TENANTS.map((t) => t.company),
  ...GREENHOUSE_BOARDS.map((b) => b.company),
];

export const tier1Sources: Source[] = [
  {
    id: "amazon:jobs",
    label: "Amazon Jobs (India)",
    tier: 1,
    run: fetchAmazon,
  },
  {
    id: "oracle:jpmorgan",
    label: "JPMorgan Chase careers",
    tier: 1,
    run: () => fetchOracleRecruiting("JPMorgan", "jpmc.fa.oraclecloud.com", "CX_1001"),
  },
  {
    id: "successfactors:sap",
    label: "SAP (SuccessFactors)",
    tier: 1,
    run: () => fetchSuccessFactors("SAP", "jobs.sap.com"),
  },
  ...WORKDAY_TENANTS.map<Source>((t) => ({
    id: `workday:${t.tenant}`,
    label: `${t.company} (Workday)`,
    tier: 1,
    run: () => fetchWorkday(t),
  })),
  ...GREENHOUSE_BOARDS.map<Source>((b) => ({
    id: `greenhouse:${b.board}`,
    label: `${b.company} (Greenhouse)`,
    tier: 1,
    run: () => fetchGreenhouse(b.company, b.board),
  })),
];
