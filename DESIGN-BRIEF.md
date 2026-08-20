# Internship Radar — design brief

Design the layout however you think best. This describes the product, the user,
and the content — not how to arrange it. Use the theme attached in the chat.

---

## The product

A private internship radar built for one student. Every morning it scans ~39
sources on its own — company career sites, GitHub job trackers, Internshala and
Unstop, Indian off-campus newsletters, research labs — and collects every
internship he's genuinely eligible for. It scores each one against his actual CV
and tells him which of his own projects to lead with when he applies.

He stars roles, marks them applied, and gets a weekly digest.

**The core job:** he opens this, scans ~35 roles in under a minute, and leaves
with the 2 or 3 worth acting on today. Speed of triage is the entire value.

**The thing that matters most:** roles the scanner has never seen before. Those
are freshly opened, and applying within 48 hours materially changes his odds.
Everything else is browsing; this is the signal.

## The user

B.Tech Computer Science, SRM Chennai, class of 2028, CGPA 9.15. Chasing Summer
2027 internships. Based in Chennai, so Chennai and remote roles matter more to
him than anywhere else. He has real internships, four research papers and a
national hackathon finish behind him — he's competitive, and he knows a Reach
role from a realistic one.

He is technical, impatient, and checks this daily on a laptop and occasionally
on a phone.

## What the system knows about each role

- Job title, company, location, stipend (often missing)
- Whether it was **first seen in today's scan** — the urgency signal
- An **odds rating** for him specifically: Strong / Moderate / Reach, backed by
  a 0–100 score and a short list of reasons, e.g. *"+ LLM/RAG/agents (matches
  WEB PILOT, SEVA, 4 papers)"*, *"− NVIDIA runs an extremely selective process"*
- A **lead-with tag** — which of his projects to headline, e.g. `agentic-AI`,
  `security`, `DS`, `fullstack/fintech`, `research`
- A deadline, when the source publishes one (today, most don't)
- Which of six source tiers it came from, ranging from a company's own careers
  API down to community posts
- A direct link to the real application page

Per-role, he can bookmark and mark-applied; marking applied auto-stamps the date.

## What he needs to do

- Spot what just opened, immediately
- Judge fit fast, and drill into *why* a role was rated that way when he wants to
- Narrow by odds, by location, by status, by source quality, or by keyword
- Apply, and record that he applied
- Review a starred shortlist
- Look back over what he's applied to, and when
- Read a weekly digest, and export it as a PDF

## Screens needed

Five, defined by purpose — structure them however works:

1. **The feed** — every currently-open role, newest first. The main screen.
2. **Bookmarks** — his shortlist.
3. **Applied** — a dated log of everything he's applied to.
4. **Weekly report** — a Sunday digest of what opened, what to prioritise, what's
   closing, and his week in numbers. Must print cleanly to PDF.
5. **Past reports** — the same, for earlier weeks.

Every screen also needs a way to trigger a fresh scan on demand, and should make
clear when the data was last refreshed.

Two smaller things that need a home somewhere: a handful of companies can't be
scanned automatically and have to be checked by hand, and occasionally some
sources fail a run — he should be able to see both without either dominating.

## Design challenges worth solving

- Newly-opened roles must break through, but ~35 items all shouting is noise.
- Urgency decays. A role found this morning and one found three weeks ago
  currently look identical.
- There are many ways to slice this — odds, location, status, source, free text —
  and filters can easily consume the screen before a single role is visible.
- Most roles are Moderate. The rare Strong and the Chennai roles need to surface
  without the rest feeling like filler.
- The applied view is by nature a list of things already done — it should still
  feel like a useful record, not a graveyard.
- Roles carry a variable number of signals, so cards or rows are unevenly dense.

## Real sample data

| Company | Role | Location | Odds | Lead with |
|---|---|---|---|---|
| IBM | Data Scientist Intern | Bangalore | Strong (72) | DS |
| SONY | Data Science Intern | Bangalore, Remote | Strong (67) | DS |
| FRND | Software Engineer Intern | India | Strong (66) | fullstack/fintech |
| DarkRange Systems | Security Engineering Intern | Bengaluru | Moderate (64) | security |
| Rubrik | Application Security Intern | Bangalore | Moderate (59) | security |
| Sprinklr | Research Intern | Gurgaon | Moderate (54) | research |
| Qualcomm | Engineering Intern | Chennai | Moderate (52) | fullstack/fintech |
| Kaleris | Software Engineer Intern | Chennai | Moderate (52) | fullstack/fintech |
| AlphaGrep | Quantitative Developer Intern | Mumbai | Moderate (43) | DS |
| Salesforce | Summer Intern | Bangalore | Reach (18) | fullstack/fintech |

The eight lead-with tags: `agentic-AI`, `data-platform`, `security`,
`Indic/social`, `doc-AI`, `fullstack/fintech`, `DS`, `research`.

Realistic proportions: ~35 roles at a time, mostly Moderate, a few Strong, a few
Reach. Only about 2 in 35 are in Chennai. Stipends and deadlines are usually
missing — the design shouldn't depend on them being there.
