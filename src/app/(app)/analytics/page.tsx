import { createClient } from "@/lib/supabase/server";
import { getAccounts, getRiskSettings, getTrades } from "@/lib/data";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const accounts = await getAccounts(supabase);
  const activeAccount = accounts[0] ?? null;
  const [trades, riskSettings] = await Promise.all([
    activeAccount ? getTrades(supabase, activeAccount.id) : Promise.resolve([]),
    activeAccount ? getRiskSettings(supabase, activeAccount.id) : Promise.resolve(null),
  ]);

  return (
    <AnalyticsDashboard
      trades={trades}
      riskSettings={riskSettings}
      accountName={activeAccount?.name ?? "No account"}
    />
  );
}