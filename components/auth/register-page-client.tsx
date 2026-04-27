"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function RegisterPageClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Auto sign in after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Account created — please sign in.");
      setLoading(false);
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Create account</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password (min 8)</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, background: "#111", color: "#fff", border: "none" }}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        <a href="/login">Already have an account?</a>
      </p>
    </div>
  );
}
