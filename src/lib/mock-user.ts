/**
 * Local single-user mode.
 *
 * Instead of requiring a real Supabase account, the app can be used by
 * signing in with a fixed admin/admin credential. This module is the single
 * source of truth for that mock user's identity.
 */
export const MOCK_ADMIN = {
  email: "admin",
  password: "admin",
} as const;

/** The fixed user id every row belongs to in single-user mode. */
export const MOCK_USER_ID = "admin-local";

/** The user object the rest of the app treats as "signed in". */
export const MOCK_SUPABASE_USER = {
  id: MOCK_USER_ID,
  email: "admin@local",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
} as const;

/** Returns true when the given email/password match the local admin login. */
export function isAdminCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === MOCK_ADMIN.email &&
    password === MOCK_ADMIN.password;
}