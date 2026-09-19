#!/usr/bin/env node
/**
 * Test if watchlist_items has all the alert columns
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
  'trigger_price',
  'trigger_direction',
  'entry_price',
  'stop_loss',
  'take_profit',
  'alert_fired',
  'alert_fired_at'
];

async function testTable() {
  console.log("Testing watchlist_items alert columns...\n");
  
  // Try to select all the alert columns
  const { data, error } = await supabase
    .from("watchlist_items")
    .select(REQUIRED_COLUMNS.join(','))
    .limit(1);
  
  if (error) {
    console.error("❌ Table query failed:", error.message);
    
    if (error.message.includes("Could not find the") || error.message.includes("column")) {
      console.log("\n📋 Missing columns detected. Run this migration in Supabase SQL Editor:");
      console.log("─".repeat(60));
      const migrationPath = resolve(ROOT, "supabase/migrations/002_trade_alerts.sql");
      console.log(readFileSync(migrationPath, "utf8"));
      console.log("─".repeat(60));
    }
    return false;
  }
  
  console.log("✅ All alert columns exist!");
  console.log("Sample data:", data);
  
  // Test the alert watcher query
  const watcherQuery = `
    id,
    user_id,
    symbol,
    trigger_price,
    entry_price,
    stop_loss,
    take_profit,
    alert_fired
  `;
  
  const { data: watcherData, error: watcherError } = await supabase
    .from("watchlist_items")
    .select(watcherQuery)
    .eq("alert_fired", false)
    .not("trigger_price", "is", null);
  
  if (watcherError) {
    console.error("❌ Alert watcher query failed:", watcherError.message);
    return false;
  }
  
  console.log("✅ Alert watcher query works!");
  console.log("   Active trigger items:", watcherData?.length ?? 0);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 ALL WATCHLIST TESTS PASSED!");
  console.log("=".repeat(50));
  
  return true;
}

testTable().then(success => {
  process.exit(success ? 0 : 1);
});