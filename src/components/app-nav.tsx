"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const LINKS = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/journal", label: "Journal" },
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

        <div className="ml-auto flex items-center gap-1.5 h-full">
          <NotificationBell />

          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className={`p-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-panel ${
              isActive("/settings") ? "text-accent" : ""
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>

          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            className="hidden sm:block text-sm text-muted hover:text-loss cursor-pointer whitespace-nowrap ml-1.5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}