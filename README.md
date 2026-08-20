# Internship Radar

A self-refreshing radar for **Summer 2027 internships** (2028 batch, penultimate
year), rated against one specific profile: B.Tech CSE, SRM IST Chennai, CGPA 9.15.

**Four times a day** (06:00 / 12:00 / 18:00 / 00:00 IST) a GitHub Action sweeps
every source in priority order, diffs the results against everything seen
before, and commits the new listings. Anything whose fingerprint has never been
seen gets flagged **🚨 OPENED — apply within 48h** — and if it has Strong odds
or is in Chennai, the workflow opens a GitHub issue, which GitHub emails you.
That matters: a 48-hour window is worthless if you find out three days later.

On Sundays it also writes a weekly report that renders inside the site.

---

## How the daily scan works

`npm run scan` (`scripts/scan.ts`) does five things:

1. **Sweeps every source** in tier order, six at a time. Each source is isolated:
   a timeout, a 404 or a blocked IP is recorded and skipped — one dead source
   never fails the run. Failures render at the bottom of the dashboard.
2. **Filters centrally**, so every source is judged identically. A listing
   survives only if it is an internship (word-boundary matched, so "Internal
   Audit" does not qualify), located in India or genuinely remote, technical in
   discipline, and not caught by the exclusion rules.
3. **Fingerprints** each role as `sha1(company + role + location)`, normalized.
   The URL and req id are deliberately excluded, so re-posting the same req
   under a new id does not read as newly opened.
4. **Diffs against `data/history.json`.** Unseen fingerprints are marked
   `isNew`. On the very first run history is empty, so the run is recorded as a
   baseline and nothing is falsely claimed to have "just opened".
5. **Rates every role** 0–100 against the profile and picks which project to
   headline, then writes `data/db.json` and `data/history.json`.

If a source fails, roles it previously supplied are **carried forward** rather
than disappearing from the feed.

### The six source tiers

| Tier | What | Live sources |
|---|---|---|
| 1 | Big-tech & quant ATS | Amazon, JPMorgan, Salesforce, NVIDIA, Adobe, Intel, PayPal, Target, Morgan Stanley, Tower Research, IMC, Optiver, Graviton, AlphaGrep |
| 2 | GitHub daily trackers | speedyapply 2027 SWE + AI `INTERN_INTL.md` (roles added in the last ~4 days) |
| 3 | Chennai + remote rolling | Internshala (4 searches), Unstop, Freshworks, Fractal, Databricks, Zoho, Wadhwani AI, Planys |
| 4 | India newsletters | FreshersDunia, OffCampusJobs4u, EnggWave, Placement-Officer |
| 5 | Research labs | AI4Bharat, MSR India, IBM Research, Google Research, Adobe Research, IISc, IAS-INSA-NASI SRFP |
| 6 | Community | r/developersIndia, r/Btechtards — Reddit blocks datacenter IPs, so this tier **fails silently by design** |

**Workday note.** Workday's free-text search is too weak to surface India intern
reqs (searching "intern" on Salesforce returns none of them). The scanner instead
discovers each tenant's India *location facet* at run time — the parameter name
and value ids differ per tenant, and the applicable one is often nested — then
pages through the whole India result set.

### Tier-1 companies without a live adapter

Google, Microsoft, Apple, Cisco, Qualcomm, Uber, IBM, SAP, ServiceNow,
Snowflake, Wells Fargo, Goldman Sachs, D. E. Shaw and Quadeye expose no
key-free endpoint that works from a headless runner — Microsoft's `gcsservices`
API no longer resolves at all, and its careers site is a pure SPA.

They are **still on the priority list**: marked `live: false` in
`lib/profile.ts`, surfaced as a watchlist of deep links on the dashboard, and
picked up indirectly whenever tiers 2 and 4 post them.

### Odds rating

Base 50, then adjusted by: skill overlap (only the two strongest matches count,
so keyword-stuffed descriptions cannot inflate a score), company selectivity,
location (Chennai +10, remote +6), hard mismatches (PhD-only, VLSI/RTL, heavy
C++/HFT, non-CS disciplines), a bonus for research roles against his 4 papers,
and a bonus where CGPA cutoffs are mentioned.

`Strong` ≥ 65 · `Moderate` 40–64 · `Reach` < 40. Every card shows its reasoning
behind the "why?" link.

### Lead-with mapping

| Tag | Headline project |
|---|---|
| agentic-AI | WEB PILOT |
| data-platform | strata |
| security | SEVA |
| Indic/social | Sevai-Scout |
| doc-AI | FORENSIQ |
| fullstack/fintech | PDS Global |
| DS | K Labs + strata |
| research | SEVA + Calibration at Scale |

### Exclusions

Fee-charging mills (TSTEPS, KaashivInfoTech, Top Tech Developers, and similar),
unpaid/certificate-only roles, aged-out programs (Google STEP, Microsoft
Explore), 2026-batch fresher and full-time drives (Cognizant GenC, HCL GET,
Ramco/Chargebee graduate programs), non-technical functions, and any drive dated
entirely to a past year.

### Known limitation: Cloudflare and datacenter IPs

Three tier-4 newsletters (OffCampusJobs4u, EnggWave, Placement-Officer) and both
Reddit sources answer normally from a home connection but return **403 from
GitHub Actions runners**, which sit in datacenter IP ranges Cloudflare blocks.
Header tuning does not change this, and the scanner does not try to defeat bot
protection.

What happens instead: those sources are recorded as failed and shown on the
dashboard, and roles they previously supplied are carried forward — but only for
**21 days**, after which they are dropped so the feed cannot accumulate zombie
listings. Running `npm run scan` locally picks them up properly and commits the
result, which is worth doing occasionally.

---

## Board discovery

Guessing ATS board tokens does not work. 21 hand-guessed tokens for well-known
Indian companies produced 3 hits — Razorpay's real Greenhouse token is
`razorpaysoftwareprivatelimited`, which nobody would guess.

```bash
npm run discover          # all companies
npm run discover razorpay # just one
```

`scripts/discover.ts` works in two passes:

1. **Careers-page crawl** — fetches each company's careers page from
   `lib/companies.ts`, reads whichever ATS it embeds, and verifies the board
   actually serves postings before trusting it. This finds boards for the
   companies that render their careers page server-side.
2. **Tracker harvest** — most careers pages are client-rendered SPAs, so the
   ATS link is not in the raw HTML (68 of 77 crawls came back empty on that
   basis alone). But the tier-2 job trackers are full of real apply URLs that
   *are* ATS links, already paired with a company name in the same table row.
   Harvesting those recovers boards the crawl cannot see.

Results are cached in `data/boards.json`, so the daily scan never pays the
discovery cost. Boards rarely move — re-run this occasionally, or when a
company stops appearing in the feed. The Actions workflow can also re-run it
via the `rediscover` input.

**Platforms with no key-free public endpoint**, checked and ruled out:
Darwinbox (its candidate portal redirects to a login and the API 500s), Keka,
Eightfold (403), and Zoho Recruit (401). SAP's SuccessFactors *does* render
server-side and is scanned.

---

## Adding or removing companies

Everything lives in two files.

**Priority list, exclusions, profile, lead-with mapping** — `lib/profile.ts`.
Add a company to `TIER1_COMPANIES` with its selectivity `bar` and a `watchUrl`.
Set `live: true` only once it also has an adapter.

**Live scanning** — `scripts/sources/`. Most companies need one line, because
the ATS adapters are generic:

```ts
// scripts/sources/tier1.ts
const GREENHOUSE_BOARDS = [
  { company: "Optiver", board: "optiver" },   // boards-api.greenhouse.io/v1/boards/<board>/jobs
];

const WORKDAY_TENANTS = [
  // https://<tenant>.<cluster>.myworkdayjobs.com/<site>
  { company: "NVIDIA", tenant: "nvidia", cluster: "wd5", site: "NVIDIAExternalCareerSite" },
];
```

Adapters available: `fetchGreenhouse`, `fetchLever`, `fetchAshby`,
`fetchSmartRecruiters`, `fetchWorkday`, `fetchOracleRecruiting`, `fetchAmazon`,
plus `parseCareersAnchors` for plain HTML careers pages.

To remove a company, delete its entry — the next run drops its roles.

---

## Where state lives

Bookmark / Applied / applied-date are keyed by role fingerprint, so they survive
every scan. Two modes, resolved automatically at page load:

- **Upstash / Vercel KV** — if `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the
  `UPSTASH_REDIS_REST_*` equivalents) are set, `/api/state` becomes the source of
  truth and state syncs across devices. The daily job then snapshots KV back into
  `data/state.json` as a committed backup.
- **No KV configured** — state is kept in the browser's `localStorage`, seeded
  from the committed `data/state.json`. Works with zero setup; it just doesn't
  follow you to another device.

The scan **never** clears state; it only ever reads it.

### Closed listings

When a role disappears from a working source, the listing has come down. It is
dropped from the feed — unless it is bookmarked or applied, in which case it is
kept and marked `status: "closed"`. Without that, marking a role applied and
then having the company take the req down would quietly erase the entry from
your own application log.

Closed roles never count towards the open total and never appear in the feed;
they show in Bookmarks and Applied with a "listing closed" tag.

---

## Running locally

```bash
npm install
npm run discover # find each company's ATS board -> data/boards.json
npm run scan     # sweep every source, write data/db.json + data/history.json
npm run report   # write data/reports/YYYY-Www.json for the current week
npm run dev      # http://localhost:3000
```

`npm run report 2026-W34` regenerates a specific past week.

---

## Deploying

1. Import the repo on Vercel (framework auto-detects as Next.js, no build config
   needed). The Git integration redeploys on every push, which is what makes the
   daily commit show up on the site.
2. Optional env vars:

   | Variable | Purpose |
   |---|---|
   | `KV_REST_API_URL` / `KV_REST_API_TOKEN` | cross-device Bookmark/Applied state |
   | `GH_REPO` | `owner/repo` — enables the header's "Run scan now" button |
   | `GH_DISPATCH_TOKEN` | GitHub token with `workflow` scope, for the same button |

3. Optional repo secrets for the Action: the same two `KV_*` values, plus
   `VERCEL_DEPLOY_HOOK` if you'd rather force a redeploy than rely on the Git
   integration.

### Enabling cross-device state (KV)

1. Vercel dashboard → the `internship-radar` project → **Storage** → **Create
   Database** → **Upstash for Redis** → pick the free tier, region Mumbai
   (`ap-south-1`) → **Connect to Project**.
2. Vercel injects the credentials as env vars automatically. Both naming
   schemes work — `KV_REST_API_URL`/`KV_REST_API_TOKEN` or
   `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
3. **Redeploy** (Deployments → ⋯ → Redeploy). Env vars only apply to builds
   made after they are added.
4. Optional, so the Action can snapshot state back into the repo: copy the same
   two values into GitHub → repo **Settings → Secrets and variables → Actions →
   New repository secret**.

The footer stops saying "saved in this browser" once KV is live. State already
in a browser stays there — KV starts empty.

### Enabling the one-click "Run scan now" button

`GH_REPO` is already set. It needs a token that can dispatch the workflow:

1. github.com → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Repository access** → *Only select repositories* → `Internship-Tracker`.
3. **Permissions → Repository permissions → Actions → Read and write**. Nothing
   else is needed.
4. Generate, copy the token, then add it to Vercel — either in the dashboard
   (Settings → Environment Variables → `GH_DISPATCH_TOKEN`, Production) or:

   ```bash
   npx vercel env add GH_DISPATCH_TOKEN production
   ```

5. Redeploy.

Until that token exists the button does not dead-end: it returns a direct link
to the workflow so the run is one extra click away. `npm run scan` locally also
works, and finds more (see the Cloudflare note above).

---

## Layout

```
app/            dashboard, /bookmarks, /applied, /report, /report/[week], API routes
components/     RoleCard, Feed (filters), ReportView, StateProvider, ScanButton
lib/            profile + priority list, odds engine, normalizers, types, KV access
scripts/scan.ts     the daily sweep
scripts/report.ts   the weekly report builder
scripts/sources/    one module per tier, plus the generic ATS adapters
data/           db.json, history.json, state.json, reports/ — committed on purpose
```
