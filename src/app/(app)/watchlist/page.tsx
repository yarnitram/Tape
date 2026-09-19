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

  // Read the user's preferred refresh interval (seconds) so the client can
  // poll the MEXC API at the configured cadence.
  let refreshIntervalSec = 10;
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("refresh_interval_sec")
      .eq("user_id", user.id)
      .maybeSingle();
    const n = Number(
      (settings as { refresh_interval_sec?: number | null } | null)
        ?.refresh_interval_sec ?? 10
    );
    if (Number.isFinite(n) && n >= 3) refreshIntervalSec = n;
  }

  return (
    <WatchlistClient
      initialItems={(data ?? []) as WatchlistItem[]}
      refreshIntervalSec={refreshIntervalSec}
    />
  );
}