export interface DonationAddress {
  chain: string;
  network: string;
  symbol: string;
  address: string;
  memo?: string;
  icon: string;
  color: string;
  recommendedFor?: string;
}

export interface DonationConfig {
  title: string;
  subtitle: string;
  description: string;
  addresses: DonationAddress[];
  affiliate: {
    enabled: boolean;
    title: string;
    description: string;
    exchange: string;
    referralCode: string;
    url: string;
    perks: string[];
  };
}

export const DONATION_CONFIG: DonationConfig = {
  title: "Support MOCHEX Server Hosting",
  subtitle: "100% Free & Open for the Crypto Community",
  description:
    "MOCHEX is built and maintained for free. If this terminal helps you catch a breakout, avoid a bad trade, or maintain execution discipline, a small tip helps keep our high-speed hosting and live MEXC market data feeds running!",
  addresses: [
    {
      chain: "Solana",
      network: "Solana Mainnet",
      symbol: "SOL / USDC / USDT",
      address: "6u4wXqYF9eDZb5YnBsmEwL1h4c2kNm3Zp9K7tWx1vRqA",
      icon: "🟣",
      color: "#9945FF",
      recommendedFor: "Fastest & lowest fees (~$0.001)",
    },
    {
      chain: "EVM",
      network: "Base / Arbitrum / Ethereum / BSC",
      symbol: "ETH / USDC / USDT",
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      icon: "🔷",
      color: "#3b82f6",
      recommendedFor: "Base & Arbitrum L2s supported",
    },
    {
      chain: "Bitcoin",
      network: "BTC Native SegWit",
      symbol: "BTC",
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      icon: "🟠",
      color: "#f59e0b",
      recommendedFor: "Direct on-chain Bitcoin",
    },
  ],
  affiliate: {
    enabled: true,
    title: "Support for $0 with Exchange Discounts",
    description:
      "Want to support MOCHEX without spending a dime? Sign up on MEXC with our community partner link. You get discounted trading fees, and a fraction of exchange fees helps fund our server hosting costs!",
    exchange: "MEXC Global",
    referralCode: "mochex",
    url: "https://futures.mexc.com/exchange/BTC_USDT?inviteCode=mochex",
    perks: [
      "0% Maker Fees on Futures",
      "10% Trading Fee Rebate",
      "Funds server hosting passively at zero cost to you",
    ],
  },
};
