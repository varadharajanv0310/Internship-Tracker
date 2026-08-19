import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { loadDb, loadSeedState } from "@/lib/db";
import { ScanButton } from "@/components/ScanButton";
import { StateProvider } from "@/components/StateProvider";

export const metadata: Metadata = {
  title: "Internship Radar",
  description:
    "Daily scan of newly-opened Summer 2027 internships, rated against one profile.",
};

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/applied", label: "Applied" },
  { href: "/report", label: "Weekly report" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [db, seedState] = await Promise.all([loadDb(), loadSeedState()]);

  return (
    <html lang="en">
      <body className="radar-bg min-h-screen antialiased">
        <StateProvider seed={seedState}>
        <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-[#0a0c10]/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Internship Radar</span>
            </Link>

            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs text-zinc-500 sm:inline">
                last scan{" "}
                <span className="font-medium text-zinc-300">{db.runDate}</span>
                {db.stats.totalRoles > 0 && (
                  <> · {db.stats.totalRoles} open</>
                )}
              </span>
              <ScanButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

        <footer className="no-print mx-auto max-w-7xl px-4 pb-10 pt-4 text-xs text-zinc-600 sm:px-6">
          Scans {db.stats.sourcesOk + db.stats.sourcesFailed} sources daily at 06:00 IST ·
          rated for B.Tech CSE, SRM IST Chennai, 2028 batch · Summer 2027 season.
        </footer>
        </StateProvider>
      </body>
    </html>
  );
}
