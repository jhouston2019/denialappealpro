"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE } from "@/lib/theme/app-shell";

const box: React.CSSProperties = {
  maxWidth: "400px",
  margin: "48px auto",
  padding: "24px",
  background: "#fff",
  border: "1px solid #ccc",
  fontFamily: "system-ui, sans-serif",
};

function safePathNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const nextPath = safePathNext(searchParams.get("next"));
  const bannerReason = searchParams.get("reason");
  const resetOk = searchParams.get("reset") === "ok";
  const paidOk = searchParams.get("paid") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErr(error.message || "Sign in failed");
        return;
      }
      // Full navigation so middleware + Server Components see Supabase cookie session (soft nav races SSR auth).
      const destination = nextPath ?? "/dashboard";
      window.location.assign(destination);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Cannot reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendResetLink = async () => {
    const e = email.trim().toLowerCase();
    if (!e) {
      setErr("Enter your email in the Email field above, then click Email password reset link.");
      return;
    }
    setErr("");
    setResetSent(false);
    setResetLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
      if (!origin) {
        setErr("Site URL is not configured (NEXT_PUBLIC_SITE_URL).");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${origin}/auth/reset`,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px", background: PAGE_BG_SLATE, minHeight: "calc(100vh - 60px)" }}>
      <div style={box}>
        <h1 style={{ margin: "0 0 8px", fontSize: "20px" }}>Denial Queue</h1>
        <p style={{ margin: "0 0 16px", fontSize: "14px", color: TEXT_MUTED_ON_SLATE }}>Sign in to continue.</p>
        {paidOk && (
          <p role="status" style={{ margin: "0 0 12px", fontSize: "13px", color: "#166534" }}>
            Payment successful. Please log in.
          </p>
        )}
        {resetOk && (
          <p role="status" style={{ margin: "0 0 12px", fontSize: "13px", color: "#166534" }}>
            Password updated. You can sign in below.
          </p>
        )}
        {bannerReason === "missing_profile" && (
          <p role="alert" style={{ margin: "0 0 12px", fontSize: "13px", color: "#9a6700" }}>
            Your account could not load a profile in the database. Try again shortly, or contact support if this continues.
          </p>
        )}
        <form onSubmit={(e) => void submit(e)}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>Password (min 8)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
          />
          {err && <p style={{ color: "#b00020", fontSize: "13px" }}>{err}</p>}
          {resetSent && (
            <p role="status" style={{ fontSize: "13px", color: "#166534" }}>
              Check your email for a link to set your password, then return here to sign in.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              background: "#222",
              color: "#fff",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "…" : "Sign in"}
          </button>
          <p
            style={{
              margin: "16px 0 8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Forgot your password?
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "12px", color: TEXT_MUTED_ON_SLATE }}>
            Fill in your email above, then send a reset link (also use this if you paid with Stripe before choosing a password).
          </p>
          <button
            type="button"
            onClick={() => void sendResetLink()}
            disabled={resetLoading}
            style={{
              width: "100%",
              padding: "10px",
              background: "#fff",
              color: "#1e293b",
              border: "1px solid #94a3b8",
              borderRadius: "4px",
              cursor: resetLoading ? "wait" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {resetLoading ? "Sending…" : "Email password reset link"}
          </button>
        </form>
        <p style={{ marginTop: "16px", fontSize: "13px" }}>
          <Link href="/register">Create an account</Link>
          {" · "}
          <Link href="/pricing">Subscribe</Link>
          {" · "}
          <Link href="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
