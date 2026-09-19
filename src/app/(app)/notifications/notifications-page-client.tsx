"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Notification, NotificationType } from "@/lib/types";

interface NotificationsPageClientProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

const PAGE_SIZE = 20;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "📈";
    case "risk_warning":
      return "⚠️";
    case "watchlist_trigger":
      return "🔔";
    case "system":
    default:
      return "📢";
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "text-gain";
    case "risk_warning":
      return "text-loss";
    case "watchlist_trigger":
      return "text-accent";
    case "system":
    default:
      return "text-muted";
  }
}

function getNotificationBg(type: NotificationType): string {
  switch (type) {
    case "trade_alert":
      return "bg-green-500/10";
    case "risk_warning":
      return "bg-red-500/10";
    case "watchlist_trigger":
      return "bg-yellow-500/10";
    case "system":
    default:
      return "bg-gray-500/10";
  }
}

export function NotificationsPageClient({
  initialNotifications,
  initialUnreadCount,
}: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialNotifications.length >= PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Derived state - compute unread notifications early
  const unreadNotifications = notifications.filter((n) => !n.read);

  // Handle indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < unreadNotifications.length;
    }
  }, [selectedIds, unreadNotifications.length]);

  // Fetch more notifications
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
      });
      if (filter === "unread") params.set("unread", "true");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) => [...prev, ...data.notifications]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, filter, loadingMore, hasMore]);

  // Fetch notifications with current filter (reset)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setCursor(null);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
      });
      if (filter === "unread") params.set("unread", "true");

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setSelectedIds(new Set());
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Refetch when filter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleFilterChange = useCallback(
    (newFilter: "all" | "unread") => {
      setFilter(newFilter);
      fetchNotifications();
    },
    [fetchNotifications]
  );

  // Mark selected as read
  const handleMarkSelectedRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      setNotifications((prev) =>
        prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - selectedIds.size));
      setSelectedIds(new Set());
    } catch {
      // Silently fail
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setSelectedIds(new Set());
    } catch {
      // Silently fail
    }
  };

  // Handle individual notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      const newSelected = new Set(selectedIds);
      newSelected.add(notification.id);
      setSelectedIds(newSelected);
      // Trigger mark as read for this one
      handleMarkSelectedRead();
    }
    if (notification.link) {
      router.push(notification.link);
      router.refresh();
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all visible
  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold brand">Notifications</h1>
          <p className="text-muted text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread of ${notifications.length} total`
              : `All caught up — ${notifications.length} total`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn-ghost px-3 py-1.5 text-sm"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-panel rounded-lg p-1" role="tablist">
        <button
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => handleFilterChange("all")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            filter === "all"
              ? "bg-paper text-text shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          All
        </button>
        <button
          role="tab"
          aria-selected={filter === "unread"}
          onClick={() => handleFilterChange("unread")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            filter === "unread"
              ? "bg-paper text-text shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-loss text-white rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-accent-weak rounded-lg hairline">
          <span className="text-sm text-text">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkSelectedRead}
              className="accent-btn px-3 py-1.5 text-sm rounded"
            >
              Mark as read
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="btn-ghost px-3 py-1.5 text-sm"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-panel border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-muted">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">
            {filter === "unread" ? "No unread notifications 🎉" : "No notifications yet"}
          </div>
        ) : (
          <>
            {/* Select all checkbox header (only for unread filter) */}
            {filter === "unread" && unreadNotifications.length > 0 && (
              <div className="px-4 py-3 hairline-b flex items-center gap-3 bg-paper/50">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={selectedIds.size === unreadNotifications.length && unreadNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-accent"
                  aria-label="Select all visible"
                />
                <span className="text-sm text-muted">
                  Select all {unreadNotifications.length} unread
                </span>
              </div>
            )}

            <ul role="list" className="divide-y divide-line">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <label
                    className={`flex items-start gap-4 px-4 py-4 transition-colors cursor-pointer ${
                      !notification.read ? "bg-accent-weak" : "hover:bg-paper/50"
                    }`}
                  >
                    {/* Checkbox for selection (only show for unread in unread filter) */}
                    {filter === "unread" && !notification.read && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="mt-1 w-4 h-4 accent-accent flex-shrink-0"
                        aria-label="Select notification"
                      />
                    )}

                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${getNotificationBg(notification.type)} ${getNotificationColor(notification.type)}`}
                      aria-hidden="true"
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-medium truncate ${!notification.read ? "font-semibold" : ""}`}>
                          {notification.title}
                        </h3>
                        <time className="flex-shrink-0 text-xs text-muted" dateTime={notification.created_at}>
                          {formatTimeAgo(notification.created_at)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-muted line-clamp-2">{notification.message}</p>
                      {notification.link && (
                        <p className="mt-2 text-xs text-accent hover:underline cursor-pointer">
                          Click to view →
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-4 border-t border-line">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-accent hover:underline disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Empty state for unread filter when all read */}
      {filter === "unread" && !loading && notifications.length > 0 && unreadNotifications.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-lg font-medium mb-1">All caught up! 🎉</p>
          <p className="text-sm">No unread notifications.</p>
        </div>
      )}
    </div>
  );
}