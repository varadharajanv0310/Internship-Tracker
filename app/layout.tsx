import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Aurora } from "@/components/Aurora";
import { Chrome } from "@/components/Chrome";
import { StateProvider } from "@/components/StateProvider";
import { listReportWeeks, loadDb, loadLatestReport, loadSeedState } from "@/lib/db";
import { fmtDate } from "@/lib/view";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Internship Radar",
  description:
    "Daily scan of newly-opened Summer 2027 internships, rated against one profile.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [db, seedState, weeks, latest] = await Promise.all([
    loadDb(),
    loadSeedState(),
    listReportWeeks(),
    loadLatestReport(),
  ]);

  return (
    <html lang="en" className={plexMono.variable}>
      <body>
        <StateProvider seed={seedState}>
          <div className="page">
            <Aurora />
            <div className="shell">
              <Chrome
                ids={db.roles.map((r) => ({ id: r.id, status: r.status }))}
                runDate={fmtDate(db.runDate)}
                sourcesOk={db.stats.sourcesOk}
                sourcesFailed={db.stats.sourcesFailed}
                reportLabel={latest ? fmtDate(latest.weekEnd) : "—"}
                reportCount={weeks.length}
              />
              {children}
            </div>
          </div>
        </StateProvider>
      </body>
    </html>
  );
}
