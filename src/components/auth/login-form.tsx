"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/journal";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is disabled, a session is returned immediately.
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setNotice(
        "Account created. If email confirmation is enabled, check your inbox to verify before signing in."
      );
    }
  }

  const isSignup = mode === "signup";
  const submitLabel = loading
    ? "Working…"
    : isSignup
      ? "Create account"
      : "Sign in";

  return (
    <div className="w-full max-w-sm">
      <div className="surface rounded-xl p-8 shadow-sm">
        <h1 className="brand text-4xl mb-1">Tape</h1>
        <p className="text-muted mb-6">Personal trading journal</p>

        <div className="flex gap-0 hairline-b mb-6 w-full">
        <button
          type="button"
          onClick={() => toggleMode("signin")}
          className={`px-4 py-2 text-sm cursor-pointer ${
            mode === "signin"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => toggleMode("signup")}
          className={`px-4 py-2 text-sm cursor-pointer ${
            mode === "signup"
              ? "text-accent border-b-2 border-accent"
              : "text-muted"
          }`}
        >
          Create account
        </button>
      </div>

      {error ? (
        <div className="hairline border-loss text-loss px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="hairline px-3 py-2 mb-4 text-sm">{notice}</div>
      ) : null}

      <form
        onSubmit={isSignup ? handleSignUp : handleSignIn}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="hairline bg-panel-soft px-3 py-2 text-sm outline-none focus:border-accent rounded-md"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Password</span>
          <input
            type="password"
            required
            minLength={isSignup ? 6 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="hairline bg-panel-soft px-3 py-2 text-sm outline-none focus:border-accent rounded-md"
          />
        </label>

        {isSignup && (
          <p className="text-xs text-muted">
            Anyone can create an account — no email confirmation required.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="accent-btn mt-2 px-4 py-2 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </form>
      </div>
    </div>
  );
}