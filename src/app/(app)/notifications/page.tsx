import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsPageClient } from "./notifications-page-client";

export const dynamic = "force-dynamic";

/** Server component to fetch initial notifications and pass to client. */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch first page of notifications
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to fetch notifications:", error);
  }

  // Fetch unread count for the badge
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  // Fetch the true total across all pages for an accurate header count.
  const { count: total } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <NotificationsPageClient
      initialNotifications={notifications ?? []}
      initialUnreadCount={unreadCount ?? 0}
      initialTotal={total ?? 0}
    />
  );
}