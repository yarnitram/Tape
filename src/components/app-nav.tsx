"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const LINKS = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/journal", label: "Journal" },
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
    <header className="hairline-b bg-paper/90 sticky top-0 z-20 backdrop-blur">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 h-16 flex items-center gap-5">
        <Link href="/watchlist" className="brand text-2xl shrink-0" aria-label="Tape home">
          Tape
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-1 h-full min-w-0 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-md transition-colors ${
                isActive(l.href)
                  ? "text-accent bg-accent-weak font-medium"
                  : "text-muted hover:text-text hover:bg-panel-soft"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 h-full">
          <NotificationBell />
          <ThemeToggle />

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