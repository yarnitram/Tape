/**
 * Risk Management & Position Sizing Calculator Utilities for Tape.
 */

export interface RiskCalcParams {
  accountBalance: number; // e.g. 5000 USD
  riskPct: number;        // e.g. 1%
  entryPrice: number;     // e.g. 60000
  stopLoss: number;       // e.g. 59000
  takeProfit?: number;    // e.g. 64000
  leverage?: number;      // e.g. 20
}

export interface RiskCalcResult {
  maxRiskUsd: number;         // Max loss in USD (e.g. $50)
  priceRiskUsd: number;       // Absolute price difference per coin
  priceRiskPct: number;       // Risk distance in %
  positionCoins: number;      // Position size in base coin units (e.g. 0.05 BTC)
  notionalUsd: number;        // Total position value in USD
  requiredMarginUsd: number;  // Margin required at chosen leverage
  recommendedLeverage: number;// Minimum leverage needed for margin <= maxRiskUsd
  riskRewardRatio: number | null; // R:R ratio (e.g. 4.0)
  potentialRewardUsd: number | null; // Total profit if TP is hit
}

export function calculatePositionRisk(params: RiskCalcParams): RiskCalcResult {
  const { accountBalance, riskPct, entryPrice, stopLoss, takeProfit, leverage = 10 } = params;

  const safeBalance = Math.max(0, accountBalance || 0);
  const safeRiskPct = Math.max(0, riskPct || 0);
  const safeEp = Math.max(0.000001, entryPrice || 0);
  const safeSl = Math.max(0.000001, stopLoss || 0);
  const safeLev = Math.max(1, leverage || 1);

  const maxRiskUsd = safeBalance * (safeRiskPct / 100);
  const priceRiskUsd = Math.abs(safeEp - safeSl);
  const priceRiskPct = (priceRiskUsd / safeEp) * 100;

  // Position Size (Coins) = Max Risk ($) / Price Risk ($)
  const positionCoins = priceRiskUsd > 0 ? maxRiskUsd / priceRiskUsd : 0;
  const notionalUsd = positionCoins * safeEp;
  const requiredMarginUsd = notionalUsd / safeLev;
  const recommendedLeverage = requiredMarginUsd > 0 ? Math.ceil(notionalUsd / maxRiskUsd) : 1;

  let riskRewardRatio: number | null = null;
  let potentialRewardUsd: number | null = null;

  if (takeProfit != null && takeProfit > 0 && priceRiskUsd > 0) {
    const tpDistance = Math.abs(takeProfit - safeEp);
    riskRewardRatio = tpDistance / priceRiskUsd;
    potentialRewardUsd = positionCoins * tpDistance;
  }

  return {
    maxRiskUsd,
    priceRiskUsd,
    priceRiskPct,
    positionCoins,
    notionalUsd,
    requiredMarginUsd,
    recommendedLeverage,
    riskRewardRatio,
    potentialRewardUsd,
  };
}
