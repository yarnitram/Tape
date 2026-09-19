"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/ui/notification-bell";

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
    <header className="hairline-b bg-paper/95 sticky top-0 z-20 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-8">
        <Link href="/watchlist" className="brand text-2xl shrink-0">
          Tape
        </Link>

        <nav className="flex items-center gap-1 h-full">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 text-sm transition-colors ${
                isActive(l.href)
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted hover:text-text"
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
            className="text-sm text-muted hover:text-loss cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}