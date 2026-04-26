"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE } from "@/lib/theme/app-shell";

const box: React.CSSProperties = {
  maxWidth: "400px",
  margin: "48px auto",
  padding: "24px",
  background: "#fff",
  border: "1px solid #ccc",
  fontFamily: "system-ui, sans-serif",
};

function networkErrorMessage(status: number, text: string) {
  if (text) return text;
  if (status === 429) return "Too many login attempts. Wait up to an hour and try again.";
  if (status >= 500) return "Server error. The API may be down or misconfigured.";
  return "Something went wrong";
}

async function readJsonError(res: Response) {
  try {
    const j = (await res.json()) as { error?: string; message?: string };
    return j.error || j.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function LoginPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        if (!res.ok) {
          const m = await readJsonError(res);
          setErr(m || networkErrorMessage(res.status, ""));
          return;
        }
        await res.json();
        router.replace("/dashboard");
        router.refresh();
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        if (!res.ok) {
          const msg = await readJsonError(res);
          setErr(msg);
          return;
        }
        await res.json();
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Cannot reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px", background: PAGE_BG_SLATE, minHeight: "calc(100vh - 60px)" }}>
      <div style={box}>
        <h1 style={{ margin: "0 0 8px", fontSize: "20px" }}>Denial Queue</h1>
        <p style={{ margin: "0 0 16px", fontSize: "14px", color: TEXT_MUTED_ON_SLATE }}>
          {mode === "login" ? "Sign in to load your saved claims." : "Create an account to persist your queue."}
        </p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "8px",
              border: mode === "login" ? "2px solid #333" : "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            style={{
              flex: 1,
              padding: "8px",
              border: mode === "register" ? "2px solid #333" : "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </div>
        <form onSubmit={submit}>
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
            {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: "16px", fontSize: "13px" }}>
          <Link href="/pricing">Subscribe</Link>
          {" · "}
          <Link href="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
