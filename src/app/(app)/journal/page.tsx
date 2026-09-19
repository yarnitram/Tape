import { createClient } from "@/lib/supabase/server";
import { getAccounts, getRiskSettings, getTags, getTrades } from "@/lib/data";
import { TradeJournal } from "@/components/journal/trade-journal";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const accounts = await getAccounts(supabase);
  const activeAccount = accounts[0] ?? null;
  const [trades, tags, riskSettings] = await Promise.all([
    activeAccount ? getTrades(supabase, activeAccount.id) : Promise.resolve([]),
    getTags(supabase),
    activeAccount ? getRiskSettings(supabase, activeAccount.id) : Promise.resolve(null),
  ]);

  return (
    <TradeJournal
      accounts={accounts}
      activeAccount={activeAccount}
      initialTrades={trades}
      initialTags={tags}
      riskSettings={riskSettings}
    />
  );
}