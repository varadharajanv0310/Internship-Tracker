import { Feed } from "@/components/Feed";
import { loadDb } from "@/lib/db";
import { TIER1_COMPANIES } from "@/lib/profile";

export default async function FeedPage() {
  const db = await loadDb();
  const watchlist = TIER1_COMPANIES.filter((c) => !c.live).map((c) => ({
    name: c.name,
    watchUrl: c.watchUrl,
  }));

  return <Feed roles={db.roles} failures={db.failures} watchlist={watchlist} />;
}
