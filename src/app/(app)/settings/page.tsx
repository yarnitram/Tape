import { createClient } from "@/lib/supabase/server";
import { getAccounts, getRiskSettings } from "@/lib/data";
import { SettingsForm } from "@/components/settings/settings-form";
import { RiskSettingsForm } from "@/components/risk/risk-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm">Sign in to manage settings.</p>;
  }

  // Notification settings.
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const d = (data as {
    discord_webhook_url?: string | null;
    notify_discord?: boolean;
    notify_desktop?: boolean;
    refresh_interval_sec?: number | null;
  } | null);

  // Risk settings (now hosted on the Settings page).
  const accounts = await getAccounts(supabase);
  const activeAccount = accounts[0] ?? null;
  const riskSettings = activeAccount
    ? await getRiskSettings(supabase, activeAccount.id)
    : null;

  return (
    <div className="flex flex-col gap-10">
      <SettingsForm
        userEmail={user.email ?? ""}
        initial={{
          discord_webhook_url: d?.discord_webhook_url ?? null,
          notify_discord: d?.notify_discord ?? true,
          notify_desktop: d?.notify_desktop ?? true,
          refresh_interval_sec: d?.refresh_interval_sec ?? 10,
        }}
      />

      <div className="hairline-t pt-8">
        <RiskSettingsForm account={activeAccount} settings={riskSettings} />
      </div>
    </div>
  );
}