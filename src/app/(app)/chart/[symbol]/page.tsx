import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChartWorkspaceClient } from "@/components/charts/chart-workspace-client";
import { cleanSymbol } from "@/lib/format";

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const cleanSym = cleanSymbol(symbol);
  return {
    title: `${cleanSym} Interactive Candlestick Chart | Tape Journal`,
    description: `Real-time MEXC Futures candlestick chart and trade setup overlay for ${cleanSym}.`,
  };
}

export default async function ChartPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard route: dedicated chart page is restricted to authenticated users only
  if (!user) {
    redirect("/login");
  }

  const { symbol } = await params;
  return <ChartWorkspaceClient symbol={symbol} />;
}
