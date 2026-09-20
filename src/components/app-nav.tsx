"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/ui/notification-bell";

const LINKS = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/journal", label: "Journal" },
  { href: "/analytics", label: "Analytics" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="hairline-b bg-paper/95 sticky top-0 z-20 backdrop-blur">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 h-16 flex items-center gap-5">
        <Link href="/watchlist" className="brand text-2xl shrink-0" aria-label="Tape home">
          Tape
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-1 h-full min-w-0 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2.5 sm:px-3 py-1.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
                isActive(l.href)
                  ? "text-accent border-accent"
                  : "text-muted border-transparent hover:text-text hover:border-line-strong"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 h-full">
          <NotificationBell />

          <button
            type="button"
            onClick={handleLogout}
            className="hidden sm:block text-sm text-muted hover:text-loss cursor-pointer whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}