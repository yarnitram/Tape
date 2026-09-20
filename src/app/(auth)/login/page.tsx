import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/watchlist");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <LoginForm />
    </main>
  );
}