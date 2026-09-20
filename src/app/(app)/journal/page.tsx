import { createClient } from "@/lib/supabase/server";
import { getAccounts, getRiskSettings, getTags, getTrades } from "@/lib/data";
import { TradeJournal } from "@/components/journal/trade-journal";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Resolve the user once here and hand it to getAccounts so we avoid a
  // second auth.getUser() round-trip; run accounts + tags in parallel, then
  // pull trades/risk settings once we know the active account.
  const [accounts, tags] = await Promise.all([
    getAccounts(supabase, user),
    getTags(supabase),
  ]);
  const activeAccount = accounts[0] ?? null;
  const [trades, riskSettings] = await Promise.all([
    activeAccount ? getTrades(supabase, activeAccount.id) : Promise.resolve([]),
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