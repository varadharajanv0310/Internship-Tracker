import { notFound } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import { listReportWeeks, loadReport } from "@/lib/db";

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
  const [report, weeks] = await Promise.all([loadReport(week), listReportWeeks()]);
  if (!report) notFound();
  return <ReportView report={report} weeks={weeks} />;
}
