import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TradesClient } from "@/components/trades/trades-client";
import type { TradeAlert } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Server component to fetch fired trade alerts and pass to the client. */
export default async function TradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("trade_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("fired_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch trade alerts:", error);
  }

  // Read the user's preferred refresh interval (seconds) so the client can
  // poll for newly fired alerts at the configured cadence.
  let refreshIntervalSec = 10;
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

  return (
    <TradesClient
      initialAlerts={(data ?? []) as TradeAlert[]}
      refreshIntervalSec={refreshIntervalSec}
    />
  );
}