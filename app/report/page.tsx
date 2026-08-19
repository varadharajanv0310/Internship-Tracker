import Link from "next/link";
import { ReportView } from "@/components/ReportView";
import { listReportWeeks, loadLatestReport } from "@/lib/db";

export default async function LatestReportPage() {
  const [report, weeks] = await Promise.all([loadLatestReport(), listReportWeeks()]);

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
        <p className="text-sm text-zinc-400">No weekly report generated yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          The Sunday run writes the first one, or generate it locally with{" "}
          <code className="rounded bg-white/5 px-1 py-0.5">npm run report</code>.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-xs text-sky-400 underline-offset-2 hover:underline"
        >
          back to feed
        </Link>
      </div>
    );
  }

  return <ReportView report={report} weeks={weeks} />;
}
