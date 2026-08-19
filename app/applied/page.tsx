import { Feed } from "@/components/Feed";
import { loadDb } from "@/lib/db";

export default async function AppliedPage() {
  const db = await loadDb();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Application log
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every role marked applied, with the date it was stamped.
        </p>
      </div>
      <Feed
        roles={db.roles}
        variant="applied"
        emptyMessage="No applications logged yet — mark a role applied and it lands here with today's date."
      />
    </div>
  );
}
