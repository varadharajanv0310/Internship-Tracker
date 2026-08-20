import Link from "next/link";
import { ReportView } from "@/components/ReportView";
import { loadDb, loadLatestReport } from "@/lib/db";
import { TIER1_COMPANIES } from "@/lib/profile";

export default async function LatestReportPage() {
  const [report, db] = await Promise.all([loadLatestReport(), loadDb()]);

  if (!report) {
    return (
      <div style={{ padding: "80px 0" }}>
        <p className="big-title" style={{ fontSize: 34 }}>
          No report yet
        </p>
        <p className="meta dim" style={{ marginTop: 14 }}>
          The Sunday run writes the first one — or generate it with npm run report
        </p>
        <Link href="/" className="linkish linkish-acc meta" style={{ display: "inline-block", marginTop: 22 }}>
          → Back to feed
        </Link>
      </div>
    );
  }

  return (
    <ReportView
      report={report}
      sourcesTotal={db.stats.sourcesOk + db.stats.sourcesFailed}
      failures={db.failures.map((f) => ({ sourceLabel: f.sourceLabel }))}
      manualCount={TIER1_COMPANIES.filter((c) => !c.live).length}
    />
  );
}
