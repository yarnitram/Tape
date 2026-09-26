"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/watchlist";

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
      <div className="card-base rounded-2xl p-8 shadow-2xl">
        <h1 className="brand-gradient text-4xl font-extrabold tracking-tight mb-1">MOCHEX</h1>
        <p className="text-muted text-xs mb-6">Crypto trading setup journal</p>

        <div className="flex gap-0 border-b border-line mb-6 w-full">
          <button
            type="button"
            onClick={() => toggleMode("signin")}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
              mode === "signin"
                ? "text-accent border-b-2 border-accent font-semibold"
                : "text-muted hover:text-text"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => toggleMode("signup")}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
              mode === "signup"
                ? "text-accent border-b-2 border-accent font-semibold"
                : "text-muted hover:text-text"
            }`}
          >
            Create account
          </button>
        </div>

        {error ? (
          <div className="rounded-xl bg-loss/10 border border-loss/20 text-loss px-3 py-2 mb-4 text-xs">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl bg-accent/10 border border-accent/20 text-text px-3 py-2 mb-4 text-xs">
            {notice}
          </div>
        ) : null}

        <form
          onSubmit={isSignup ? handleSignUp : handleSignIn}
          className="flex flex-col gap-3.5"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base w-full"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={isSignup ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base w-full"
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
            className="accent-btn mt-2 py-2.5 w-full text-sm font-bold disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}