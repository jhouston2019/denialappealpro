"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api-client";
import { ApiError } from "@/lib/api/api-error";
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE, TEXT_ON_SLATE } from "@/lib/theme/app-shell";

type Profile = {
  provider_name: string;
  provider_npi: string;
  provider_address: string;
  provider_phone: string;
  provider_fax: string;
};

function errMsg(e: unknown) {
  if (e instanceof ApiError && e.response.data && typeof e.response.data === "object" && "error" in e.response.data) {
    return String((e.response.data as { error: string }).error);
  }
  return "Request failed";
}

export default function AccountClient() {
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const { data } = await api.get<Profile>("/api/user/profile");
      setP(data);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!p) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      await api.put("/api/user/profile", p);
      setMsg("Saved");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const openPortal = async () => {
    setErr("");
    try {
      const { data } = await api.post<{ url: string }>("/api/stripe/create-portal", {});
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  if (loading || !p) {
    return (
      <div style={{ padding: 24, background: PAGE_BG_SLATE, minHeight: "60vh", color: TEXT_ON_SLATE }}>
        Loading account…
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "24px 20px 48px",
        fontFamily: "system-ui, sans-serif",
        background: PAGE_BG_SLATE,
        minHeight: "calc(100vh - 60px)",
        color: TEXT_ON_SLATE,
      }}
    >
      <p style={{ margin: "0 0 20px" }}>
        <Link href="/dashboard" style={{ color: "#86efac", fontWeight: 600 }}>
          ← Dashboard
        </Link>
      </p>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Account</h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: TEXT_MUTED_ON_SLATE }}>Provider defaults used on appeals and batch intake.</p>

      {err && (
        <p style={{ color: "#fca5a5", fontSize: 14, marginBottom: 12 }} role="alert">
          {err}
        </p>
      )}
      {msg && <p style={{ color: "#86efac", fontSize: 14, marginBottom: 12 }}>{msg}</p>}

      <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          Provider name
          <input
            value={p.provider_name}
            onChange={(e) => setP({ ...p, provider_name: e.target.value })}
            style={{ padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: TEXT_ON_SLATE }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          NPI
          <input
            value={p.provider_npi}
            onChange={(e) => setP({ ...p, provider_npi: e.target.value })}
            style={{ padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: TEXT_ON_SLATE }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          Address
          <textarea
            value={p.provider_address}
            onChange={(e) => setP({ ...p, provider_address: e.target.value })}
            rows={2}
            style={{ padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: TEXT_ON_SLATE }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          Phone
          <input
            value={p.provider_phone}
            onChange={(e) => setP({ ...p, provider_phone: e.target.value })}
            style={{ padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: TEXT_ON_SLATE }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          Fax
          <input
            value={p.provider_fax}
            onChange={(e) => setP({ ...p, provider_fax: e.target.value })}
            style={{ padding: 8, fontSize: 14, borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: TEXT_ON_SLATE }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{ padding: "10px 18px", fontWeight: 600, cursor: saving ? "wait" : "pointer", borderRadius: 6, border: "none", background: "#0d9488", color: "#fff" }}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={() => void openPortal()}
          style={{
            padding: "10px 18px",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 6,
            border: "1px solid #64748b",
            background: "transparent",
            color: TEXT_ON_SLATE,
          }}
        >
          Manage billing
        </button>
      </div>
    </div>
  );
}
