/**
 * TIER 2 — speedyapply GitHub daily trackers.
 * Rows look like:
 * | <a href="..."><strong>Company</strong></a> | Position | Location | <a href="APPLY"><img/></a> | 3d |
 * A leading "↳" in the company cell means "same company as the row above".
 */
import { ageToIso, decodeEntities, getText, stripTags, type RawRole, type Source } from "./base";

const TRACKERS = [
  {
    id: "tracker:swe",
    label: "speedyapply 2027 SWE — INTERN_INTL",
    url: "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/INTERN_INTL.md",
  },
  {
    id: "tracker:ai",
    label: "speedyapply 2027 AI — INTERN_INTL",
    url: "https://raw.githubusercontent.com/speedyapply/2027-AI-College-Jobs/main/INTERN_INTL.md",
  },
];

/** Roles added within this many days count as fresh for the tracker sweep. */
const MAX_AGE_DAYS = 4;

export function parseTrackerMarkdown(md: string): RawRole[] {
  const roles: RawRole[] = [];
  let lastCompany = "";

  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+/.test(line) || /\|\s*Company\s*\|/i.test(line)) continue;

    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;

    const [companyCell, positionCell, locationCell, applyCell, ageCell] = cells;

    let company = decodeEntities(stripTags(companyCell)).replace(/[↳➔→]/g, "").trim();
    if (!company || companyCell.includes("↳")) company = lastCompany;
    if (!company) continue;
    lastCompany = company;

    const role = decodeEntities(stripTags(positionCell));
    const location = decodeEntities(stripTags(locationCell));
    const urlMatch = applyCell?.match(/href="([^"]+)"/);
    if (!role || !urlMatch) continue;

    const age = (ageCell ?? "").trim();
    const postedAt = ageToIso(age);

    // Skip anything the tracker says is older than the sweep window.
    if (age && !isWithinWindow(age)) continue;

    roles.push({
      company,
      role,
      location,
      url: decodeEntities(urlMatch[1]),
      postedAt,
      description: role,
    });
  }
  return roles;
}

function isWithinWindow(age: string): boolean {
  const m = age.match(/^(\d+)\s*(d|w|mo|y)$/i);
  if (!m) return true; // unknown age -> let the central filter decide
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const days = unit === "d" ? n : unit === "w" ? n * 7 : unit === "mo" ? n * 30 : n * 365;
  return days <= MAX_AGE_DAYS;
}

export const tier2Sources: Source[] = TRACKERS.map((t) => ({
  id: t.id,
  label: t.label,
  tier: 2,
  run: async () => parseTrackerMarkdown(await getText(t.url)),
}));
