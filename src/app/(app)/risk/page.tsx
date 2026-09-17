import { createClient } from "@/lib/supabase/server";
import { getAccounts, getRiskSettings } from "@/lib/data";
import { RiskSettingsForm } from "@/components/risk/risk-settings-form";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  const supabase = await createClient();
  const accounts = await getAccounts(supabase);
  const activeAccount = accounts[0] ?? null;
  const settings = activeAccount
    ? await getRiskSettings(supabase, activeAccount.id)
    : null;

  return (
    <RiskSettingsForm account={activeAccount} settings={settings} />
  );
}