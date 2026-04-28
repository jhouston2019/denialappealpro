"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE } from "@/lib/theme/app-shell";

function safePathNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function readHashType(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
}

async function waitForRecoveryFlag(flag: { current: boolean }, maxMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (flag.current) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return flag.current;
}

export default function AuthCallback() {
  const recoveryLock = useRef(false);
  const [ready, setReady] = useState(false);
  const [flow, setFlow] = useState<"loading" | "recovery" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryLock.current = true;
      }
    });

    const run = async () => {
      if (readHashType() === "recovery") {
        recoveryLock.current = true;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Auth callback error:", error);
          setErrorMessage(error.message);
          setFlow("error");
          setReady(true);
          return;
        }
        url.searchParams.delete("code");
        const qs = url.searchParams.toString();
        window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
      }

      await waitForRecoveryFlag(recoveryLock, 400);

      if (recoveryLock.current || readHashType() === "recovery") {
        setFlow("recovery");
        setReady(true);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Auth callback error:", sessionError);
        setErrorMessage(sessionError.message);
        setFlow("error");
        setReady(true);
        return;
      }

      if (sessionData.session) {
        const nextRaw = new URLSearchParams(window.location.search).get("next");
        const next = safePathNext(nextRaw) ?? "/dashboard";
        window.location.assign(next);
        return;
      }

      setErrorMessage("Session could not be established. The link may have expired.");
      setFlow("error");
      setReady(true);
    };

    void run();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!ready || flow === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: PAGE_BG_SLATE,
          color: TEXT_MUTED_ON_SLATE,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }

  if (flow === "recovery") {
    return <ResetPassword />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: PAGE_BG_SLATE,
        color: "#fef2f2",
        fontFamily: "system-ui, sans-serif",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 18, margin: "0 0 12px" }}>Sign-in link issue</h1>
      <p style={{ margin: "0 0 16px", lineHeight: 1.5 }}>{errorMessage}</p>
      <Link href="/login" style={{ color: "#86efac", fontWeight: 700 }}>
        Back to login
      </Link>
    </div>
  );
}

function ResetPassword() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update = async () => {
    setErr(null);
    const p = password.trim();
    if (p.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) {
        setErr(error.message);
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: PAGE_BG_SLATE,
          color: TEXT_MUTED_ON_SLATE,
          fontFamily: "system-ui, sans-serif",
          maxWidth: 440,
          margin: "0 auto",
        }}
      >
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>Password set. You can now log in.</p>
        <p style={{ margin: "16px 0 0" }}>
          <Link href="/login?reset=ok" style={{ color: "#86efac", fontWeight: 700 }}>
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: PAGE_BG_SLATE,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          margin: "48px auto",
          padding: 24,
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>Set your password</h2>
        <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>New password</label>
        <input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          style={{ width: "100%", padding: 10, marginBottom: 12, boxSizing: "border-box" }}
        />
        {err ? <p style={{ color: "#b91c1c", margin: "0 0 12px", fontSize: 14 }}>{err}</p> : null}
        <button
          type="button"
          onClick={() => void update()}
          disabled={busy}
          style={{
            padding: "12px 20px",
            background: busy ? "#94a3b8" : "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving…" : "Set password"}
        </button>
      </div>
    </div>
  );
}
