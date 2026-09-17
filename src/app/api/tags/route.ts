import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTags } from "@/lib/data";

/** GET /api/tags — list the current user's tags. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tags = await getTags(supabase);
    return NextResponse.json({ tags });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}