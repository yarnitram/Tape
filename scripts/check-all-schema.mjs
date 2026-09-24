#!/usr/bin/env node
/**
 * Check the state of all app tables/columns against the expected schema.
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

// Tables from schema.sql + migrations
const EXPECTED = {
  accounts: ["id", "user_id", "name", "broker", "starting_balance", "current_balance", "created_at"],
  trades: ["id", "account_id", "symbol", "direction", "entry_price", "exit_price", "size", "stop_price", "fees", "entry_time", "exit_time", "status", "created_at"],
  tags: ["id", "user_id", "name", "category"],
  trade_tags: ["trade_id", "tag_id"],
  trade_notes: ["trade_id", "pre_trade_thesis", "post_trade_review", "discipline_score", "screenshot_url"],
  risk_settings: ["account_id", "max_daily_loss", "max_position_risk_pct", "max_open_positions"],
  watchlist_items: ["id", "user_id", "symbol", "notes", "alert_price", "added_at",
    "trigger_price", "trigger_direction", "entry_price", "stop_loss", "take_profit", "alert_fired", "alert_fired_at"],
  user_settings: ["user_id", "discord_webhook_url", "notify_discord", "notify_desktop", "updated_at", "refresh_interval_sec"],
  trade_alerts: ["id", "user_id", "watchlist_item_id", "symbol", "trigger_price", "trigger_direction",
    "fired_price", "entry_price", "stop_loss", "take_profit", "order_type", "notes",
    "margin_usd", "leverage", "sl_fired_at", "tp_fired_at", "fired_at", "created_at"],
};

async function checkTable(name, columns) {
  // Probe a single row purely to confirm the table exists (we only use `error`).
  const { error } = await supabase
    .from(name)
    .select("*")
    .limit(1);

  if (error) {
    const status = error.message.includes("Could not find the table")
      ? "❌ TABLE MISSING"
      : "❌ ERROR";
    console.log(`${name}: ${status} — ${error.message.split("\n")[0]}`);
    return;
  }

  console.log(`✅ ${name}: table exists`);

  // Try to introspect columns via information_schema is not available via PostgREST.
  // Do a probe query per expected column to find missing ones.
  const missing = [];
  for (const col of columns) {
    const probe = await supabase
      .from(name)
      .select(col)
      .limit(1);
    if (probe.error) {
      if (probe.error.message.toLowerCase().includes("column")) {
        missing.push(col);
      }
    }
  }
  if (missing.length) {
    console.log(`   ⚠️  Missing columns: ${missing.join(", ")}`);
  } else {
    console.log(`   ✅ All ${columns.length} expected columns present`);
  }
}

async function main() {
  console.log("=== Schema Check ===");
  console.log(`Target: ${SUPABASE_URL}\n`);

  for (const [table, cols] of Object.entries(EXPECTED)) {
    await checkTable(table, cols);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });