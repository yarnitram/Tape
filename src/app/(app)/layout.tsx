import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards these routes; this is a defence-in-depth check.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-full flex flex-col">
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-8 flex-1">
        {children}
      </main>
      <footer className="hairline-t py-6 text-center text-xs text-muted">
        Tape — personal trading journal
      </footer>
    </div>
  );
}