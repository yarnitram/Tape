import type { NotificationType } from "./types";

/** "Just now / 3m ago / 2h ago / 4d ago / Sep 4" relative time label. */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Full date label for the notifications page (adds the year). */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return formatTimeAgo(dateString);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "📈";
    case "risk_warning":
      return "⚠️";
    case "watchlist_trigger":
      return "🔔";
    case "sl_tp_hit":
      return "🎯";
    case "system":
    default:
      return "📢";
  }
}

export function notificationColor(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "text-gain";
    case "risk_warning":
      return "text-loss";
    case "watchlist_trigger":
      return "text-accent";
    case "sl_tp_hit":
      return "text-accent";
    case "system":
    default:
      return "text-muted";
  }
}

/** Muted circular background behind the icon (page list rows). */
export function notificationBg(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "bg-gain/10";
    case "risk_warning":
      return "bg-loss/10";
    case "watchlist_trigger":
      return "bg-accent/10";
    case "sl_tp_hit":
      return "bg-accent/10";
    case "system":
    default:
      return "bg-muted/10";
  }
}

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "Trade";
    case "risk_warning":
      return "Risk";
    case "watchlist_trigger":
      return "Trigger";
    case "sl_tp_hit":
      return "SL / TP";
    case "system":
    default:
      return "System";
  }
}

export interface ParsedNotificationMeta {
  symbol: string | null;
  pair: string | null;
  badgeLabel: string;
  badgeColorClass: string;
  lastPrice: string | null;
  triggerPrice: string | null;
  chartUrl: string | null;
  tradesUrl: string | null;
  mexcUrl: string | null;
}

/** Parses notification title, message, and type to extract token, prices, badges, and direct links. */
export function parseNotificationMetadata(notification: {
  title: string;
  message: string;
  type: NotificationType;
}): ParsedNotificationMeta {
  const { title, message, type } = notification;

  let symbol: string | null = null;

  // 1. Try extracting symbol from title patterns
  // Pattern: "BONER hit your trigger", "ETH hit your trigger", "BTC hit SL"
  const hitMatch = title.match(/^([A-Za-z0-9_]+)\s+hit\s+/i);
  if (hitMatch) {
    symbol = hitMatch[1];
  }

  // Pattern: "BONER TL trigger hit"
  if (!symbol) {
    const tlMatch = title.match(/^([A-Za-z0-9_]+)\s+TL\s+trigger/i);
    if (tlMatch) symbol = tlMatch[1];
  }

  // Pattern: "ETH TP1 Hit!" or "ETH TP Hit"
  if (!symbol) {
    const tpHitMatch = title.match(/^([A-Za-z0-9_]+)\s+TP\d*\s+Hit/i);
    if (tpHitMatch) symbol = tpHitMatch[1];
  }

  // Pattern: "[TV] BUY BTCUSDT" or "TradingView BUY ETH"
  if (!symbol) {
    const tvMatch = title.match(/(?:\[TV\]|TradingView)\s+(?:BUY|SELL|LONG|SHORT)\s+([A-Za-z0-9_]+)/i);
    if (tvMatch) symbol = tvMatch[1];
  }

  // Clean symbol: strip USDT suffix if present
  let cleanSym: string | null = null;
  let pair: string | null = null;
  if (symbol) {
    cleanSym = symbol.replace(/_?USDT$/i, "").toUpperCase();
    pair = `${cleanSym}_USDT`;
  }

  // 2. Extract price metrics
  let lastPrice: string | null = null;
  let triggerPrice: string | null = null;

  // Match: "Last 0.04765 reached your 0.0477 trigger"
  const pricePairMatch = message.match(/Last\s+([\d,.]+)\s+reached\s+your\s+([\d,.]+)\s+trigger/i);
  if (pricePairMatch) {
    lastPrice = pricePairMatch[1];
    triggerPrice = pricePairMatch[2];
  } else {
    // Match single trigger or last
    const lastOnly = message.match(/Last\s+(?:price\s+)?([\d,.]+)/i);
    if (lastOnly) lastPrice = lastOnly[1];

    const trigOnly = message.match(/Trigger\s+([\d,.]+)/i);
    if (trigOnly) triggerPrice = trigOnly[1];
  }

  // 3. Determine Event Badge Label & Color
  let badgeLabel = "ALERT";
  let badgeColorClass = "bg-panel text-muted border-line";

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("limit order armed")) {
    badgeLabel = "LIMIT ARMED";
    badgeColorClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  } else if (lowerTitle.includes("hit your trigger")) {
    badgeLabel = "TRIGGER HIT";
    badgeColorClass = "bg-accent/15 text-accent border-accent/30";
  } else if (lowerTitle.includes("tp1 hit") || lowerTitle.includes("hit tp")) {
    badgeLabel = "TP HIT";
    badgeColorClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  } else if (lowerTitle.includes("hit sl") || lowerTitle.includes("stop loss")) {
    badgeLabel = "STOP LOSS";
    badgeColorClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
  } else if (lowerTitle.includes("tradingview") || lowerTitle.includes("[tv]")) {
    badgeLabel = "TRADINGVIEW";
    badgeColorClass = "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
  } else if (type === "trade_alert") {
    badgeLabel = "TRADE";
    badgeColorClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  } else if (type === "risk_warning") {
    badgeLabel = "RISK";
    badgeColorClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
  } else if (type === "watchlist_trigger") {
    badgeLabel = "TRIGGER";
    badgeColorClass = "bg-accent/15 text-accent border-accent/30";
  } else {
    badgeLabel = "SYSTEM";
    badgeColorClass = "bg-panel text-muted border-line";
  }

  // 4. Action URLs
  const chartUrl = cleanSym ? `/chart?symbol=${cleanSym}` : null;
  const tradesUrl = "/trades";
  const mexcUrl = cleanSym ? `https://futures.mexc.com/exchange/${cleanSym}_USDT` : null;

  return {
    symbol: cleanSym,
    pair,
    badgeLabel,
    badgeColorClass,
    lastPrice,
    triggerPrice,
    chartUrl,
    tradesUrl,
    mexcUrl,
  };
}