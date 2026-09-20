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
    <div className="flex flex-col flex-1 w-full">
      <AppNav />
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-8 flex-1">
        {children}
      </main>
    </div>
  );
}