import { createClient } from "@/lib/supabase/server";
import { SharesClient } from "@/components/shares/shares-client";
import type { PublicShareLink, WatchlistItem, TradeAlert } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-sm text-muted">Sign in to manage public share pages.</p>;
  }

  // Get user settings (for username handle)
  const { data: settings } = await supabase
    .from("user_settings")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  // Get public share links
  const { data: sharesData } = await supabase
    .from("public_share_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch watchlist items and trade alerts
  const [{ data: watchlistData }, { data: tradesData }] = await Promise.all([
    supabase.from("watchlist_items").select("*").eq("user_id", user.id).order("added_at", { ascending: true }),
    supabase.from("trade_alerts").select("*").eq("user_id", user.id).order("fired_at", { ascending: false }),
  ]);

  const username = settings?.username || null;
  const initialShares: PublicShareLink[] = (sharesData || []).map((s) => ({
    ...s,
    username,
  }));

  const watchlistItems = (watchlistData || []) as WatchlistItem[];
  const tradeAlerts = (tradesData || []) as TradeAlert[];

  return (
    <SharesClient
      initialShares={initialShares}
      username={username}
      watchlistItems={watchlistItems}
      tradeAlerts={tradeAlerts}
    />
  );
}
