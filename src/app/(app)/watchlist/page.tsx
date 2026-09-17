import { createClient } from "@/lib/supabase/server";
import { WatchlistClient } from "@/components/watchlist/watchlist-client";
import type { WatchlistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("watchlist_items")
        .select("*")
        .order("added_at", { ascending: true })
    : { data: [] };

  return (
    <WatchlistClient initialItems={(data ?? []) as WatchlistItem[]} />
  );
}