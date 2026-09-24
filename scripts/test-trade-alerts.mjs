#!/usr/bin/env node
/**
 * Test if trade_alerts has all the columns the Trades page needs,
 * and that an insert / select / delete round-trip works.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

function loadDotEnv(file) {
  const out = {};
  try {
    if (!existsSync(file)) return out;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
  return out;
}

const env = loadDotEnv(resolve(ROOT, ".env.local"));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const REQUIRED_COLUMNS = [
  "id",
  "user_id",
  "watchlist_item_id",
  "symbol",
  "trigger_price",
  "trigger_direction",
  "fired_price",
  "entry_price",
  "stop_loss",
  "take_profit",
  "order_type",
  "notes",
  "margin_usd",
  "leverage",
  "fired_at",
  "created_at",
];

/**
 * trade_alerts.user_id is NOT NULL, so the probe insert needs a real user id.
 * Try the admin API first, then fall back to any existing row that carries a
 * user_id (watchlist_items / user_settings).
 */
async function findUserId() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data?.users?.length) {
      return data.users[0].id;
    }
  } catch {}

  for (const table of ["watchlist_items", "user_settings"]) {
    const { data, error } = await supabase
      .from(table)
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1);
    if (!error && data?.length) return data[0].user_id;
  }

  return null;
}

async function testTable() {
  console.log("Testing trade_alerts columns...\n");

  // Try to select all the columns
  const { data, error } = await supabase
    .from("trade_alerts")
    .select(REQUIRED_COLUMNS.join(","))
    .limit(1);

  if (error) {
    console.error("❌ Table query failed:", error.message);

    if (
      error.message.includes("Could not find the") ||
      error.message.includes("column")
    ) {
      console.log(
        "\n📋 Missing table/columns detected. Run this migration in Supabase SQL Editor:"
      );
      console.log("─".repeat(60));
      console.log(
        readFileSync(
          resolve(ROOT, "supabase/migrations/009_trade_alerts.sql"),
          "utf8"
        )
      );
      console.log("─".repeat(60));
    }
    return false;
  }

  console.log("✅ All trade_alerts columns exist!");
  console.log("   Existing rows:", data?.length ?? 0, "(sample of 1)");

  // Round-trip: insert a probe row, read it back, then remove it so no
  // junk data is left behind.
  const probeUserId = await findUserId();
  if (!probeUserId) {
    console.log(
      "\n⚠️ Could not resolve a user id (no auth users / watchlist rows).\n   Skipping the insert round-trip; the table + columns above are correct."
    );
    return true;
  }
  console.log("   Using user_id for probe:", probeUserId);

  const probe = {
    user_id: probeUserId,
    symbol: "__TEST__",
    trigger_price: 1,
    trigger_direction: "above",
    fired_price: 1.234567,
    entry_price: 1,
    stop_loss: 0.9,
    take_profit: 1.5,
    order_type: "limit",
    notes: "probe row (auto-removed)",
    fired_at: new Date().toISOString(),
  };
  const { data: inserted, error: insertError } = await supabase
    .from("trade_alerts")
    .insert(probe)
    .select("id, symbol, fired_price, order_type")
    .single();
  if (insertError) {
    console.error("❌ Insert failed:", insertError.message);
    return false;
  }
  console.log("✅ Insert works!  id:", inserted.id);
  console.log("   7-dp fired_price round-trip:", inserted.fired_price);

  const { error: deleteError } = await supabase
    .from("trade_alerts")
    .delete()
    .eq("symbol", "__TEST__");
  if (deleteError) {
    console.error(
      "⚠️ Probe row cleanup failed:",
      deleteError.message,
      "— delete the __TEST__ row manually."
    );
    return false;
  }
  console.log("✅ Probe row cleaned up.");

  console.log("\n" + "=".repeat(50));
  console.log("🎉 ALL TRADE-ALERTS TESTS PASSED!");
  console.log("=".repeat(50));

  return true;
}

testTable().then((success) => {
  process.exit(success ? 0 : 1);
});