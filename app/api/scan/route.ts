import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fires the daily-scan workflow on demand via workflow_dispatch.
 *
 * Needs two env vars on Vercel:
 *   GH_REPO            owner/repo, e.g. varadharajanv0310/Internship-Tracker
 *   GH_DISPATCH_TOKEN  a GitHub token with `workflow` scope on that repo
 *
 * Without them the button explains what to add rather than failing silently.
 */
const WORKFLOW_FILE = "daily-scan.yml";

export async function POST() {
  const repo = process.env.GH_REPO;
  const token = process.env.GH_DISPATCH_TOKEN;

  // Without a token the scan cannot be dispatched from here, but the workflow
  // is still one click away — hand back the Actions URL so the button stays
  // useful instead of dead-ending on an error.
  if (!token) {
    return NextResponse.json({
      ok: false,
      fallbackUrl: repo
        ? `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}`
        : null,
      message: repo
        ? "No dispatch token set, so this can't fire the run directly. Open the workflow and hit “Run workflow” — same result, one extra click."
        : "Manual trigger needs GH_REPO and GH_DISPATCH_TOKEN in Vercel env vars. Until then run the workflow from the repo's Actions tab, or `npm run scan` locally.",
    });
  }

  if (!repo) {
    return NextResponse.json({
      ok: false,
      fallbackUrl: null,
      message: "GH_DISPATCH_TOKEN is set but GH_REPO is missing — add owner/repo in Vercel env vars.",
    });
  }

  const branch = process.env.GH_BRANCH ?? "main";

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ref: branch }),
      },
    );

    if (res.status === 204) {
      return NextResponse.json({
        ok: true,
        message:
          "Scan queued. GitHub Actions is sweeping every source now — the site redeploys with fresh data in a couple of minutes.",
      });
    }

    const text = await res.text();
    return NextResponse.json({
      ok: false,
      fallbackUrl: `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}`,
      message: `GitHub returned ${res.status}: ${text.slice(0, 180)}`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      fallbackUrl: `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}`,
      message: err instanceof Error ? err.message : "Dispatch failed",
    });
  }
}
