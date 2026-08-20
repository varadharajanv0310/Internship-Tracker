import { ListView } from "@/components/ListView";
import { loadDb } from "@/lib/db";

export default async function AppliedPage() {
  const db = await loadDb();
  return <ListView roles={db.roles} variant="applied" />;
}
