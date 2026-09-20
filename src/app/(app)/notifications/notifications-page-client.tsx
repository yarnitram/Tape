"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Notification, NotificationType } from "@/lib/types";
import {
  formatFullDate,
  notificationIcon,
  notificationColor,
  notificationBg,
  notificationTypeLabel,
} from "@/lib/notification-utils";

interface NotificationsPageClientProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  initialTotal: number;
}

const PAGE_SIZE = 20;

export function NotificationsPageClient({
  initialNotifications,
  initialUnreadCount,
  initialTotal,
}: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialNotifications.length >= PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
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

  // Fetch notifications for a given filter (reset pagination).
  const fetchNotifications = useCallback(async (targetFilter: "all" | "unread") => {
    setLoading(true);
    setCursor(null);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (targetFilter === "unread") params.set("unread", "true");

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
  }, []);

  // Refetch on tab change. Pass the new filter explicitly so the API call uses
  // the freshly-selected tab, not the stale closure value (fixes "All" showing
  // 0 after switching from "Unread").
  const handleFilterChange = useCallback(
    (newFilter: "all" | "unread") => {
      setFilter(newFilter);
      fetchNotifications(newFilter);
    },
    [fetchNotifications]
  );

  // Mark a specific set of notifications as read.
  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch {
      // Silently fail
    }
  }, []);

  // Delete one or more notifications.
  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setDeletingIds((prev) => new Set([...prev, ...ids]));
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      // Remove from local state + update counts optimistically.
      setNotifications((prev) => {
        const idSet = new Set(ids);
        const removed = prev.filter((n) => idSet.has(n.id));
        const removedUnread = removed.filter((n) => !n.read).length;
        setUnreadCount((u) => Math.max(0, u - removedUnread));
        setTotal((t) => Math.max(0, t - removed.length));
        return prev.filter((n) => !idSet.has(n.id));
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch {
      // Silently fail
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, []);

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

  // Handle individual notification click: navigate to link + mark this one read.
  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
      router.refresh();
    }
  }

  // Toggle selection (checkbox) - does NOT navigate.
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          <p className="eyebrow mb-1">Inbox</p>
          <h1 className="text-2xl font-semibold brand">Notifications</h1>
          <p className="text-muted text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread · ${total} total`
              : `${total} total · all caught up`}
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
      <div className="flex gap-1 bg-panel rounded-lg p-1 w-fit" role="tablist">
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
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-loss text-panel rounded-full">
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
              onClick={() => markAsRead(Array.from(selectedIds))}
              className="accent-btn px-3 py-1.5 text-sm rounded"
            >
              Mark as read
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.size} notification(s)?`)) {
                  deleteNotifications(Array.from(selectedIds));
                }
              }}
              className="px-3 py-1.5 text-sm rounded border border-line text-loss hover:bg-loss/10 disabled:opacity-50"
            >
              Delete
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
          <div className="px-6 py-14 text-center text-muted">
            <div className="text-4xl mb-3">🔕</div>
            <p className="text-base font-medium text-text">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-sm mt-1">
              {filter === "unread"
                ? "You're all caught up."
                : "Alerts and activity will show up here."}
            </p>
          </div>
        ) : (
          <>
            {/* Selection / select-all bar */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 hairline-b flex items-center gap-3 bg-paper/50">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={selectedIds.size === notifications.length && notifications.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-accent"
                  aria-label="Select all visible"
                />
                <span className="text-sm text-muted">
                  Select all {notifications.length} visible
                </span>
              </div>
            )}

            <ul role="list" className="divide-y divide-line">
              {notifications.map((notification) => {
                const unread = !notification.read;
                const selected = selectedIds.has(notification.id);
                return (
                  <li
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-4 transition-colors border-l-2 ${
                      unread
                        ? "border-accent bg-accent-weak"
                        : "border-transparent hover:bg-paper/50"
                    }`}
                  >
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 accent-accent flex-shrink-0"
                      aria-label="Select notification"
                    />

                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${notificationBg(notification.type)} ${notificationColor(notification.type)}`}
                      aria-hidden="true"
                    >
                      {notificationIcon(notification.type)}
                    </div>

                    {/* Body - click navigates + marks read */}
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {unread && (
                            <span
                              className="flex-shrink-0 w-2 h-2 rounded-full bg-accent"
                              aria-hidden="true"
                            />
                          )}
                          <h3
                            className={`text-sm truncate ${
                              unread ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {notification.title}
                          </h3>
                        </div>
                        <time
                          className="flex-shrink-0 text-xs text-muted"
                          dateTime={notification.created_at}
                        >
                          {formatFullDate(notification.created_at)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-muted line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-wide text-muted">
                          {notificationTypeLabel(notification.type)}
                        </span>
                        {notification.link && (
                          <span className="text-xs text-accent hover:underline">
                            View →
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Per-row delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Delete this notification?")) {
                          deleteNotifications([notification.id]);
                        }
                      }}
                      disabled={deletingIds.has(notification.id)}
                      className="flex-shrink-0 mt-1 text-xs text-muted hover:text-loss disabled:opacity-50"
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-4 border-t border-line">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm btn-ghost rounded disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}