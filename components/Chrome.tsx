"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRoleState } from "./StateProvider";

const THEME_KEY = "internship-radar:theme";

export interface ChromeProps {
  ids: string[];
  runDate: string;
  sourcesOk: number;
  sourcesFailed: number;
  reportLabel: string;
  reportCount: number;
}

export function Chrome({
  ids,
  runDate,
  sourcesOk,
  sourcesFailed,
  reportLabel,
  reportCount,
}: ChromeProps) {
  const pathname = usePathname();
  const { state } = useRoleState();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [scan, setScan] = useState<{ busy: boolean; msg: string; url: string | null } | null>(null);
  const [lastScan, setLastScan] = useState(runDate);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light") {
        setTheme("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.setAttribute("data-theme", "light");
      }
    } catch {
      /* private mode — stay dark */
    }
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    for (const el of [document.documentElement, document.body]) {
      if (next === "light") el.setAttribute("data-theme", "light");
      else el.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function rescan() {
    setScan({ busy: true, msg: "", url: null });
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; message: string; fallbackUrl?: string | null };
      setScan({ busy: false, msg: data.message, url: data.fallbackUrl ?? null });
      if (data.ok) setLastScan("queued · just now");
    } catch (err) {
      setScan({
        busy: false,
        msg: err instanceof Error ? err.message : "Request failed",
        url: null,
      });
    }
  }

  // Applied roles leave the feed entirely — they live under Applied.
  const appliedCount = ids.filter((id) => state[id]?.applied).length;
  const starredCount = ids.filter((id) => state[id]?.bookmarked).length;
  const openCount = ids.length - appliedCount;

  const tabs: Array<{ href: string; label: string; count: string | number }> = [
    { href: "/", label: "Feed", count: openCount },
    { href: "/bookmarks", label: "Bookmarks", count: starredCount },
    { href: "/applied", label: "Applied", count: appliedCount },
    { href: "/report", label: "Weekly report", count: reportLabel },
    { href: "/report/archive", label: "Past reports", count: reportCount },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/report"
        ? pathname === "/report" || (pathname.startsWith("/report/") && pathname !== "/report/archive")
        : pathname.startsWith(href);

  return (
    <>
      <header className="masthead no-print">
        <Link href="/" className="brand" style={{ color: "inherit" }}>
          <span style={{ fontSize: 15, lineHeight: 1, color: "rgba(var(--fg-rgb),.85)" }}>↗</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="brand-name">Internship Radar</span>
            <span className="meta" style={{ fontSize: 10.5, letterSpacing: ".14em", color: "rgba(var(--fg-rgb),.42)" }}>
              Private · Summer 2027 · B.Tech CSE &rsquo;28
            </span>
          </span>
        </Link>

        <div className="head-stats">
          <div className="head-stat">
            <span>Last scan</span>
            <b>{lastScan}</b>
          </div>
          <div className="head-stat">
            <span>Sources</span>
            <b>
              {sourcesOk + sourcesFailed}
              {sourcesFailed > 0 ? ` · ${sourcesFailed} failed` : " · all ok"}
            </b>
          </div>
          <div className="head-stat">
            <span>Theme</span>
            <button type="button" className="linkish" onClick={toggleTheme}>
              {mounted ? (theme === "light" ? "→ Dark" : "→ Light") : "→ Light"}
            </button>
          </div>
          <div className="head-stat" style={{ position: "relative" }}>
            <span>On demand</span>
            <button type="button" className="linkish linkish-acc" onClick={rescan} disabled={scan?.busy}>
              → {scan?.busy ? "Scanning 39 sources…" : "Run scan now"}
            </button>

            {scan && !scan.busy && scan.msg && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 10,
                  width: 300,
                  zIndex: 50,
                  padding: "12px 14px",
                  background: "var(--bg)",
                  border: "1px solid rgba(var(--fg-rgb),.18)",
                  textTransform: "none",
                  letterSpacing: "normal",
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: "rgba(var(--fg-rgb),.8)",
                  whiteSpace: "normal",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <p style={{ margin: 0, flex: 1 }}>{scan.msg}</p>
                  <button
                    type="button"
                    onClick={() => setScan(null)}
                    aria-label="Dismiss"
                    style={{ color: "rgba(var(--fg-rgb),.4)" }}
                  >
                    ✕
                  </button>
                </div>
                {scan.url && (
                  <a
                    href={scan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta"
                    style={{ display: "inline-block", marginTop: 10, color: "var(--acc)" }}
                  >
                    → Open Actions
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="tabs no-print">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="tab" data-active={isActive(t.href)}>
            {t.label}
            <small>{t.count}</small>
          </Link>
        ))}
      </nav>
    </>
  );
}
