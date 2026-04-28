"use client";

import { useState } from "react";
import Link from "next/link";
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

/** Land here from Supabase password-recovery email; hash/PKCE session is synced by browser client. */
export default function ResetPasswordClient() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message || "Could not update password");
        return;
      }
      window.location.assign("/login?reset=ok");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px", background: PAGE_BG_SLATE, minHeight: "calc(100vh - 60px)" }}>
      <div style={box}>
        <h1 style={{ margin: "0 0 8px", fontSize: "20px" }}>Set a new password</h1>
        <p style={{ margin: "0 0 16px", fontSize: "14px", color: TEXT_MUTED_ON_SLATE }}>
          Choose a password you will use to sign in. Then you can log in as usual.
        </p>
        <form onSubmit={(e) => void submit(e)}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>New password (min 8)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
          />
          {err && <p style={{ color: "#b00020", fontSize: "13px" }}>{err}</p>}
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
            {loading ? "…" : "Save password"}
          </button>
        </form>
        <p style={{ marginTop: "16px", fontSize: "13px" }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
