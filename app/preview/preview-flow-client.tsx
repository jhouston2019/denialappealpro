"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAP_PREVIEW_PAYLOAD_KEY, type DapPreviewAnalysisResult, type DapPreviewPayloadStored } from "@/lib/dap/preview-flow";
import { useAuth } from "@/hooks/use-auth";
import { PreviewLetterDisplay } from "@/components/preview/preview-letter-display";

const PAGE_BG = "#1e293b";
const CARD = "#ffffff";
const GREEN = "#22c55e";
const YELLOW = "#eab308";
const RED = "#ef4444";

const LOADING_LINES = [
  "Reading your denial letter...",
  "Identifying denial reason...",
  "Building appeal strategy...",
] as const;

function confidenceColor(c: DapPreviewAnalysisResult["confidence"]): string {
  if (c === "High") return GREEN;
  if (c === "Low") return RED;
  return YELLOW;
}

function strengthColor(s: DapPreviewAnalysisResult["appeal_strength"]): string {
  if (s === "Strong") return GREEN;
  if (s === "Weak") return RED;
  return YELLOW;
}

export function PreviewFlowClient() {
  const { isAuthenticated, isPaid } = useAuth();
  const ctaToPricing = "/pricing";
  const [flowPayload, setFlowPayload] = useState<DapPreviewPayloadStored | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DapPreviewAnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DAP_PREVIEW_PAYLOAD_KEY);
      if (!raw) {
        setLoadError("No preview data. Upload a denial letter to get started.");
        setAnalyzeLoading(false);
        return;
      }
      const parsed = JSON.parse(raw) as DapPreviewPayloadStored;
      if (!parsed.extracted_text || !parsed.claim_data || !parsed.intake_snapshot || !parsed.mode) {
        setLoadError("Preview data was incomplete. Return to upload and try again.");
        setAnalyzeLoading(false);
        return;
      }
      setFlowPayload(parsed);
    } catch {
      setLoadError("Could not read preview data.");
      setAnalyzeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!flowPayload) return;
    let cancelled = false;
    const run = async () => {
      setAnalyzeLoading(true);
      setAnalyzeError(null);
      try {
        const res = await fetch("/api/preview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            extracted_text: flowPayload.extracted_text,
            claim_data: flowPayload.claim_data,
            intake_snapshot: flowPayload.intake_snapshot,
          }),
        });
        const data = (await res.json()) as DapPreviewAnalysisResult & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Analysis failed");
        }
        if (!cancelled) {
          setAnalysis(data);
        }
      } catch (e) {
        if (!cancelled) {
          setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
        }
      } finally {
        if (!cancelled) setAnalyzeLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [flowPayload]);

  useEffect(() => {
    if (!analyzeLoading) return;
    const t = window.setInterval(() => {
      setLoadingPhase((p) => Math.min(p + 1, LOADING_LINES.length - 1));
    }, 800);
    return () => clearInterval(t);
  }, [analyzeLoading]);

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: PAGE_BG,
          color: "#e2e8f0",
          padding: 24,
          fontFamily: '"Inter", system-ui, sans-serif',
          textAlign: "center",
        }}
      >
        <p style={{ maxWidth: 480, margin: "48px auto", lineHeight: 1.6 }}>{loadError}</p>
        <Link href="/start" style={{ color: GREEN, fontWeight: 700 }}>
          Upload your denial letter
        </Link>
      </div>
    );
  }

  if (!flowPayload) {
    return (
      <div style={{ minHeight: "100vh", background: PAGE_BG, color: "#94a3b8", padding: 24 }}>
        Loading…
      </div>
    );
  }

  const showLoadingOverlay = analyzeLoading || !analysis;
  const loadingLabel = LOADING_LINES[loadingPhase] ?? LOADING_LINES[LOADING_LINES.length - 1];
  const letterLocked = !isPaid || !isAuthenticated;
  const showPaywall = letterLocked;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
        fontFamily: '"Inter", system-ui, sans-serif',
        padding: "24px 16px 48px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {showLoadingOverlay ? (
          <div
            style={{
              textAlign: "center",
              color: "#e2e8f0",
              padding: "32px 16px",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            {loadingLabel}
          </div>
        ) : null}

        {analyzeError ? (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            {analyzeError}
          </div>
        ) : null}

        {analysis ? (
          <>
            <div
              style={{
                background: CARD,
                borderRadius: 16,
                padding: "28px 24px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                marginBottom: 28,
              }}
            >
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: "0 0 12px",
                  lineHeight: 1.2,
                }}
              >
                {analysis.denial_type}
              </h1>
              <div style={{ marginBottom: 20 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    background:
                      analysis.confidence === "High"
                        ? "rgba(34, 197, 94, 0.15)"
                        : analysis.confidence === "Low"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(234, 179, 8, 0.2)",
                    color: confidenceColor(analysis.confidence),
                  }}
                >
                  Confidence: {analysis.confidence}
                </span>
              </div>
              <p style={{ fontSize: 16, color: "#334155", lineHeight: 1.6, margin: "0 0 20px" }}>
                {analysis.summary}
              </p>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", margin: "0 0 10px" }}>
                Key issues
              </h2>
              <ul style={{ margin: "0 0 20px", paddingLeft: 22, color: "#1e293b", lineHeight: 1.55 }}>
                {analysis.key_issues.map((issue) => (
                  <li key={issue} style={{ marginBottom: 6 }}>
                    {issue}
                  </li>
                ))}
              </ul>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>Appeal strength: </span>
                <span style={{ fontWeight: 800, color: strengthColor(analysis.appeal_strength) }}>
                  {analysis.appeal_strength}
                </span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", margin: "0 0 8px" }}>
                  Strategy
                </h2>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.55 }}>{analysis.strategy}</p>
              </div>
              {analysis.carc_codes.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", margin: "0 0 8px" }}>
                    CARC codes detected
                  </h2>
                  <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
                    {analysis.carc_codes.join(", ")}
                  </p>
                </div>
              ) : null}
            </div>

            <PreviewLetterDisplay
              letterText={analysis.appeal_letter ?? ""}
              locked={letterLocked}
              unlockHref={ctaToPricing}
            />

            {showPaywall ? (
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: 16,
                  padding: "28px 22px",
                  border: "1px solid #334155",
                }}
              >
                <h2 style={{ color: "#f8fafc", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
                  Your appeal letter is ready
                </h2>
                <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.5, margin: "0 0 20px" }}>
                  Continue to choose a plan and unlock the full letter with regulatory citations.
                </p>
                <Link
                  href={ctaToPricing}
                  style={{
                    display: "inline-block",
                    background: GREEN,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 16,
                    padding: "14px 24px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  Continue to plans →
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
