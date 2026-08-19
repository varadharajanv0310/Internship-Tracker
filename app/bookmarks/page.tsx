import { Feed } from "@/components/Feed";
import { loadDb } from "@/lib/db";

export default async function BookmarksPage() {
  const db = await loadDb();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Bookmarks</h1>
        <p className="mt-1 text-sm text-zinc-500">Everything starred, newest first.</p>
      </div>
      <Feed
        roles={db.roles}
        variant="bookmarks"
        emptyMessage="Nothing bookmarked yet — hit ☆ Bookmark on any role in the feed."
      />
    </div>
  );
}
