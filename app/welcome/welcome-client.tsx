"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Msg = { kind: "ok" | "err" | "info"; text: string } | null;

/**
 * Post-checkout landing. Access to paid data is only after:
 *   - The email on the account matches the paid row in public.users, and
 *   - For email/password, Supabase has confirmed the address (or OAuth equivalent).
 * Checkout uses one email: use that for password reset and sign-in.
 * Never trust the client: server routes still re-query public.users for is_paid.
 */
export function WelcomeClient({ sessionId }: { sessionId?: string }) {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const sendReset = async () => {
    if (!email.trim()) {
      setMsg({ kind: "err", text: "Enter the same email you used in Stripe checkout." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/welcome` : undefined,
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
    } else {
      setMsg({
        kind: "ok",
        text: "Check your email for a link to set your password. You must use the same email you entered at checkout.",
      });
    }
  };

  const signIn = async () => {
    if (!email.trim() || !password) {
      setMsg({ kind: "err", text: "Email and password are required." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    if (!data.user?.email_confirmed_at) {
      setMsg({
        kind: "info",
        text: "Confirm your email from the link we sent, then sign in again. Paid access requires a verified address that matches your checkout email.",
      });
      return;
    }
    setMsg({ kind: "ok", text: "Signed in. Continue in the app (server checks your paid status)." });
  };

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>You&apos;re in</h1>
      <p style={{ color: "#475569", lineHeight: 1.5 }}>
        Your payment is complete. We linked your plan to the email used in Stripe. Use that exact email here —
        the app only unlocks when your verified account email matches the paid profile row (server-enforced, not
        client metadata).
      </p>
      {sessionId && (
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Checkout session: <code>{sessionId}</code>
        </p>
      )}

      <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Email (same as checkout)</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="dap-welcome-input"
            style={{
              padding: "10px 12px",
              fontSize: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Password (if you already set one)</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px 12px",
              fontSize: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          />
        </label>
        {msg && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: msg.kind === "err" ? "#b91c1c" : msg.kind === "ok" ? "#15803d" : "#0f172a",
            }}
          >
            {msg.text}
          </p>
        )}
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          First time: your account was created for you. Use <strong>Send password link</strong> to set a password
          for this email, then return here to sign in.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            onClick={sendReset}
            disabled={busy}
            style={{
              padding: "10px 16px",
              fontWeight: 600,
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Send password link
          </button>
          <button
            type="button"
            onClick={signIn}
            disabled={busy}
            style={{
              padding: "10px 16px",
              fontWeight: 600,
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
