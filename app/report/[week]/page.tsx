import { notFound } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import { listReportWeeks, loadDb, loadReport } from "@/lib/db";
import { TIER1_COMPANIES } from "@/lib/profile";

export async function generateStaticParams() {
  const weeks = await listReportWeeks();
  return weeks.map((week) => ({ week }));
}

export default async function ArchivedReportPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const [report, db] = await Promise.all([loadReport(week), loadDb()]);
  if (!report) notFound();

  return (
    <ReportView
      report={report}
      sourcesTotal={db.stats.sourcesOk + db.stats.sourcesFailed}
      failures={db.failures.map((f) => ({ sourceLabel: f.sourceLabel }))}
      manualCount={TIER1_COMPANIES.filter((c) => !c.live).length}
    />
  );
}
