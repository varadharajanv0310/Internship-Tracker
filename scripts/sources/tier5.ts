/**
 * TIER 5 — research internships / RA posts and fellowship windows.
 * These labs publish openings as prose on a careers page rather than through
 * an ATS, so the parser keeps only anchors that read like an actual posting.
 * When a lab has nothing open the source returns [] — that is a real result,
 * not a failure.
 */
import { getText, type RawRole, type Source } from "./base";
import { parseCareersAnchors } from "./tier3";

interface Lab {
  id: string;
  company: string;
  url: string;
}

const LABS: Lab[] = [
  { id: "ai4bharat", company: "AI4Bharat (IIT Madras)", url: "https://ai4bharat.iitm.ac.in/careers" },
  { id: "msr-india", company: "Microsoft Research India", url: "https://www.microsoft.com/en-us/research/lab/microsoft-research-india/opportunities/" },
  { id: "ibm-research", company: "IBM Research India", url: "https://research.ibm.com/careers" },
  { id: "google-research", company: "Google Research India", url: "https://research.google/careers/" },
  { id: "adobe-research", company: "Adobe Research India", url: "https://research.adobe.com/careers/" },
  { id: "iisc", company: "IISc Bangalore", url: "https://iisc.ac.in/admissions/" },
  { id: "ias-srfp", company: "IAS-INSA-NASI SRFP", url: "https://www.ias.ac.in/Initiatives/Summer_Research_Fellowship_Programme/" },
];

export const tier5Sources: Source[] = LABS.map((lab) => ({
  id: `research:${lab.id}`,
  label: lab.company,
  tier: 5,
  run: async () => scrapeLab(lab),
}));

async function scrapeLab(lab: Lab): Promise<RawRole[]> {
  const html = await getText(lab.url);
  return parseCareersAnchors(html, lab.url, lab.company).filter((r) =>
    /intern|research assistant|fellow|ra\b|summer/i.test(r.role),
  );
}
