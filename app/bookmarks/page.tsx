import { ListView } from "@/components/ListView";
import { loadDb } from "@/lib/db";

export default async function BookmarksPage() {
  const db = await loadDb();
  return <ListView roles={db.roles} variant="bookmarks" />;
}
