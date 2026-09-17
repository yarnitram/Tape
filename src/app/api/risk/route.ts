import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PUT /api/risk — upsert risk settings for an account. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const accountId = String(b.accountId ?? "");
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const numOrNull = (v: unknown) =>
    v == null || v === "" ? null : Number(v);

  const { error } = await supabase.from("risk_settings").upsert(
    {
      account_id: accountId,
      max_daily_loss: numOrNull(b.maxDailyLoss),
      max_position_risk_pct: numOrNull(b.maxPositionRiskPct),
      max_open_positions:
        b.maxOpenPositions == null || b.maxOpenPositions === ""
          ? null
          : Math.max(0, Math.round(Number(b.maxOpenPositions))),
    },
    { onConflict: "account_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}