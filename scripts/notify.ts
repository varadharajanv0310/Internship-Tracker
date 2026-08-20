/**
 * Turns newly-opened high-value roles into a GitHub issue body.
 *
 *   npx tsx scripts/notify.ts <out.md>
 *
 * Prints the number of roles worth alerting on to stdout, and writes the
 * markdown body to <out.md> when there is at least one. The workflow opens an
 * issue with it, which GitHub then emails — so the 48h window actually
 * reaches him instead of waiting for him to visit the site.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { Db, Role } from "../lib/types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.env.SITE_URL ?? "https://internship-radar-six.vercel.app";

function isChennai(loc: string): boolean {
  return /chennai|madras/i.test(loc);
}

/** Worth an email: newly opened, and either Strong odds or on his doorstep. */
function worthAlerting(r: Role): boolean {
  if (!r.isNew || r.status !== "open") return false;
  return r.odds === "Strong" || isChennai(r.location);
}

function line(r: Role): string {
  const bits = [r.location];
  if (r.stipend) bits.push(r.stipend);
  if (r.deadline) bits.push(`closes ${r.deadline}`);
  return [
    `### [${r.company} — ${r.role}](${r.url})`,
    ``,
    `**${r.odds} (${r.oddsScore}/100)** · ${bits.join(" · ")}`,
    ``,
    `Lead with **${r.leadWith}**`,
    ``,
    ...r.oddsReasons.slice(0, 3).map((x) => `- ${x}`),
    ``,
  ].join("\n");
}

async function main(): Promise<void> {
  const out = process.argv[2];
  const db = JSON.parse(await readFile(join(ROOT, "data", "db.json"), "utf8")) as Db;

  const alert = db.roles.filter(worthAlerting).sort((a, b) => b.oddsScore - a.oddsScore);

  if (alert.length === 0 || !out) {
    console.log("0");
    return;
  }

  const body = [
    `**${alert.length} role${alert.length === 1 ? "" : "s"} opened in the ${db.runDate} scan.**`,
    ``,
    `Apply inside 48h — these were not on the radar yesterday.`,
    ``,
    `---`,
    ``,
    ...alert.map(line),
    `---`,
    ``,
    `[Open the radar](${SITE}) · ${db.stats.totalRoles} roles open · ` +
      `${db.stats.sourcesOk}/${db.stats.sourcesOk + db.stats.sourcesFailed} sources answered`,
  ].join("\n");

  await writeFile(out, body, "utf8");
  console.log(String(alert.length));
}

main().catch((err) => {
  console.error("notify failed:", err);
  // Never fail the scan over a notification.
  console.log("0");
});
