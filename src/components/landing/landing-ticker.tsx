"use client";

import Link from "next/link";

interface TickerItem {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  isPositive: boolean;
  high: string;
  low: string;
}

const TICKERS: TickerItem[] = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    price: "$68,420.50",
    change24h: "+3.45%",
    isPositive: true,
    high: "$68,900.00",
    low: "$65,850.00",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    price: "$3,512.20",
    change24h: "+2.18%",
    isPositive: true,
    high: "$3,560.00",
    low: "$3,410.00",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    price: "$178.65",
    change24h: "+6.82%",
    isPositive: true,
    high: "$182.40",
    low: "$165.10",
  },
  {
    symbol: "SUIUSDT",
    name: "Sui",
    price: "$2.1450",
    change24h: "-1.24%",
    isPositive: false,
    high: "$2.2800",
    low: "$2.0800",
  },
  {
    symbol: "DOGEUSDT",
    name: "Dogecoin",
    price: "$0.1428",
    change24h: "+4.15%",
    isPositive: true,
    high: "$0.1480",
    low: "$0.1360",
  },
  {
    symbol: "NEARUSDT",
    name: "Near Protocol",
    price: "$5.840",
    change24h: "+8.92%",
    isPositive: true,
    high: "$6.100",
    low: "$5.250",
  },
  {
    symbol: "AVAXUSDT",
    name: "Avalanche",
    price: "$28.95",
    change24h: "-0.65%",
    isPositive: false,
    high: "$29.80",
    low: "$28.20",
  },
];

export function LandingTicker() {
  return (
    <div className="w-full bg-panel-soft/60 hairline-y overflow-hidden py-2.5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-line text-xs font-mono text-muted">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span className="font-semibold text-text">MEXC PERPETUALS</span>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {TICKERS.map((t) => (
              <Link
                key={t.symbol}
                href={`/chart/${t.symbol}`}
                className="flex items-center gap-2.5 text-xs hover:opacity-80 transition-opacity shrink-0 group"
                title={`Open ${t.symbol} Interactive Candlestick Chart`}
              >
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="font-bold text-text group-hover:text-accent transition-colors">
                    {t.name}
                  </span>
                  <span className="text-[11px] text-muted">{t.symbol.replace("USDT", "")}</span>
                </div>

                <span className="font-mono text-text font-medium">{t.price}</span>

                <span
                  className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    t.isPositive
                      ? "text-gain bg-gain/10 border border-gain/20"
                      : "text-loss bg-loss/10 border border-loss/20"
                  }`}
                >
                  {t.change24h}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
