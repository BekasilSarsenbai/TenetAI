"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <Logo size={20} />
          <b>Tenet</b>
        </div>

        {sent ? (
          <div className="login-sent">
            <div className="ic">✉️</div>
            <h3>Check your email</h3>
            <p>
              We sent a magic link to <strong>{email}</strong>. Click it to sign
              in — no password needed.
            </p>
          </div>
        ) : (
          <>
            <h2>Sign in</h2>
            <p className="sub">Enter your email — we&apos;ll send you a link.</p>

            <form onSubmit={sendMagicLink}>
              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {error && (
                <p style={{ color: "#ff928c", fontSize: 13, marginBottom: 8 }}>
                  {error}
                </p>
              )}
              <button className="login-submit" disabled={loading}>
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            <div className="login-div">or</div>

            <button className="login-google" onClick={signInGoogle}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <a href="https://tenet.blog" className="login-back">
          ← Back to site
        </a>
      </div>
    </div>
  );
}
