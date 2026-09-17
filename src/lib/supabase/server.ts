import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createServiceClientJs, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client bound to the request's cookies.
 * For use in Server Components, Route Handlers, and Server Actions.
 * Runs with the anon key and relies on RLS scoped to auth.uid().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore for middleware refresh.
        }
      },
    },
  });
}

/** Structural type of a server-side Supabase client (loose, schema-agnostic). */
export type ServerSupabase = ReturnType<typeof createClient> extends Promise<infer C>
  ? C
  : never;

/**
 * A service-role client for privileged server-side operations.
 * NEVER import this into a Client Component.
 */
export async function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClientJs(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient;
}