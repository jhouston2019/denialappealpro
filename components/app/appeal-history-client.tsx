"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PAGE_BG_SLATE, TEXT_ON_SLATE } from "@/lib/theme/app-shell";

type AppealItem = {
  id: string;
  appeal_id: string;
  claim_number: string | null;
  payer_name: string | null;
  status: string | null;
};

const historyList: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const historyItem: React.CSSProperties = {
  padding: "1rem",
  borderBottom: "1px solid #ecf0f1",
};

const container: React.CSSProperties = {
  background: "white",
  color: "#1e293b",
  padding: "2rem",
  borderRadius: 4,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const btnPrimary: React.CSSProperties = {
  backgroundColor: "#22c55e",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  marginTop: "0.5rem",
};

export default function AppealHistoryClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState<AppealItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/appeals/history", { credentials: "include" });
        if (res.ok) {
          const d = (await res.json()) as { appeals?: AppealItem[] };
          setAppeals(d.appeals || []);
        }
      } catch (e) {
        console.error("Failed to load appeals", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: PAGE_BG_SLATE,
          minHeight: "calc(100vh - 60px)",
          color: TEXT_ON_SLATE,
        }}
      >
        <div
          style={{
            display: "inline-block",
            width: 50,
            height: 50,
            border: "4px solid rgba(148, 163, 184, 0.35)",
            borderTop: "4px solid #22c55e",
            borderRadius: "50%",
            animation: "appeal-hist-spin 1s linear infinite",
            marginBottom: "1rem",
          }}
        />
        <style>{`@keyframes appeal-hist-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "18px", color: TEXT_ON_SLATE }}>Loading appeal history...</p>
      </div>
    );
  }

  return (
    <div style={{ background: PAGE_BG_SLATE, minHeight: "calc(100vh - 60px)", padding: "2rem 1rem" }}>
      <div className="history-container" style={container}>
        <h2 style={{ color: "#0f172a" }}>Appeal History</h2>
        {appeals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p>No appeals yet</p>
            <button type="button" style={btnPrimary} onClick={() => router.push("/start")}>
              Generate Appeal
            </button>
          </div>
        ) : (
          <ul className="history-list" style={historyList}>
            {appeals.map((appeal) => (
              <li key={appeal.id} className="history-item" style={historyItem}>
                <div>
                  <strong>Claim {appeal.claim_number || "—"}</strong>
                  <p style={{ margin: "0.5rem 0" }}>Payer: {appeal.payer_name || "—"}</p>
                  <p style={{ margin: "0.5rem 0" }}>Status: {appeal.status || "—"}</p>
                  {appeal.status === "completed" && (
                    <button
                      type="button"
                      style={btnPrimary}
                      onClick={() => {
                        window.open(`/api/queue/${encodeURIComponent(appeal.appeal_id)}/export?mode=appeal`, "_blank");
                      }}
                    >
                      Download
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
