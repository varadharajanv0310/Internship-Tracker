/**
 * TIER 6 — community posts. Reddit blocks datacenter IPs often enough that
 * this source is expected to fail on a GitHub runner; per spec it skips
 * silently rather than counting as a broken source.
 */
import { getJson, type RawRole, type Source } from "./base";

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        title?: string;
        url?: string;
        permalink?: string;
        created_utc?: number;
        selftext?: string;
        link_flair_text?: string;
      };
    }>;
  };
}

const SUBS = ["developersIndia", "Btechtards"];

async function fetchSub(sub: string): Promise<RawRole[]> {
  const url =
    `https://www.reddit.com/r/${sub}/search.json` +
    `?q=internship&restrict_sr=1&sort=new&limit=50&t=week`;
  const res = await getJson<RedditListing>(url);
  const out: RawRole[] = [];
  for (const child of res.data?.children ?? []) {
    const d = child.data;
    if (!d?.title || !d.permalink) continue;
    if (!/intern/i.test(d.title)) continue;
    out.push({
      company: `r/${sub}`,
      role: d.title,
      location: "India",
      url: `https://www.reddit.com${d.permalink}`,
      postedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString().slice(0, 10) : null,
      description: (d.selftext ?? d.title).slice(0, 800),
    });
  }
  return out;
}

export const tier6Sources: Source[] = SUBS.map((sub) => ({
  id: `reddit:${sub}`,
  label: `r/${sub} — new internship posts`,
  tier: 6,
  run: () => fetchSub(sub),
}));

/** Tier 6 failures are swallowed rather than surfaced. */
export const SILENT_SOURCE_IDS = new Set(tier6Sources.map((s) => s.id));
