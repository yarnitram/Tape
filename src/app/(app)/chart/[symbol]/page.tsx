import { Metadata } from "next";
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
  const { symbol } = await params;
  return <ChartWorkspaceClient symbol={symbol} />;
}
