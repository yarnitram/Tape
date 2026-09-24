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