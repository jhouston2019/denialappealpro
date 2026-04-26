"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Login failed");
        return;
      }
      if (data.success) {
        try {
          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("adminUser", JSON.stringify(data.admin));
        } catch {
          /* ignore */
        }
        router.replace("/admin/dashboard");
        router.refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 400, display: "grid", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Username</label>
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{ width: "100%", padding: 8 }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Password</label>
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ width: "100%", padding: 8 }}
        />
      </div>
      {err && <p style={{ color: "#b91c1c", margin: 0 }}>{err}</p>}
      <button type="submit" disabled={loading} style={{ padding: "10px 16px", fontWeight: 600 }}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
