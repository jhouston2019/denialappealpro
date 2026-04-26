"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  DAP_PREVIEW_PAYLOAD_KEY,
  DAP_RESUME_AFTER_PAYMENT_KEY,
  type DapPreviewAnalysisResult,
  type DapPreviewPayloadStored,
} from "@/lib/dap/preview-flow";

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

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

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

function LockIcon() {
  return (
    <span aria-hidden style={{ marginRight: 10, fontSize: 16 }}>
      🔒
    </span>
  );
}

export function PreviewFlowClient() {
  const [flowPayload, setFlowPayload] = useState<DapPreviewPayloadStored | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DapPreviewAnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [email, setEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
          body: JSON.stringify({
            extracted_text: flowPayload.extracted_text,
            claim_data: flowPayload.claim_data,
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

  const startCheckout = useCallback(
    async (plan: "retail" | "essential" | "professional", mode: "payment" | "subscription") => {
      if (!flowPayload || !analysis) return;
      if (!email.trim()) {
        window.alert("Enter your email — it must match the one you use to sign in after checkout.");
        return;
      }
      if (!stripePromise) {
        window.alert("Stripe is not configured.");
        return;
      }
      setCheckoutLoading(true);
      try {
        sessionStorage.setItem(
          DAP_RESUME_AFTER_PAYMENT_KEY,
          JSON.stringify({
            extracted_text: flowPayload.extracted_text,
            claim_data: flowPayload.claim_data,
            intake_snapshot: flowPayload.intake_snapshot,
            preview_data: analysis,
            mode: flowPayload.mode,
          })
        );
        const body =
          mode === "payment"
            ? { email: email.trim().toLowerCase(), plan, mode: "payment" as const }
            : { email: email.trim().toLowerCase(), plan, type: "subscription" as const };
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });
        const out = (await response.json()) as { session_id?: string; error?: string };
        if (!response.ok) {
          window.alert(out.error || "Could not start checkout.");
          return;
        }
        if (!out.session_id) {
          window.alert("No checkout session returned.");
          return;
        }
        const stripe = await stripePromise;
        if (!stripe) {
          window.alert("Stripe failed to load.");
          return;
        }
        const { error } = await stripe.redirectToCheckout({ sessionId: out.session_id });
        if (error) window.alert(error.message);
      } catch (e) {
        console.error(e);
        window.alert("Checkout error.");
      } finally {
        setCheckoutLoading(false);
      }
    },
    [flowPayload, analysis, email]
  );

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

              <div
                style={{
                  marginTop: 28,
                  paddingTop: 22,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", margin: "0 0 14px" }}>
                  Included after unlock
                </h2>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {(analysis.teaser.length ? analysis.teaser : []).map((line) => (
                    <li
                      key={line}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "12px 14px",
                        marginBottom: 10,
                        borderRadius: 10,
                        background: "#f1f5f9",
                        color: "#64748b",
                        filter: "blur(0.4px)",
                        opacity: 0.85,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <LockIcon />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              style={{
                background: "#0f172a",
                borderRadius: 16,
                padding: "28px 22px",
                border: "1px solid #334155",
              }}
            >
              <h2 style={{ color: "#f8fafc", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>
                Your Appeal Letter Is Ready
              </h2>
              <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.5, margin: "0 0 22px" }}>
                Unlock your submission-ready appeal with full regulatory citations.
              </p>

              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                  Email for checkout
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@practice.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #475569",
                    fontSize: 16,
                    background: "#1e293b",
                    color: "#f8fafc",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                }}
              >
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 18, border: "1px solid #334155" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Single appeal</div>
                  <div style={{ color: "#f8fafc", fontSize: 26, fontWeight: 800, margin: "8px 0" }}>$59</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>One-time</div>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void startCheckout("retail", "payment")}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      borderRadius: 10,
                      background: checkoutLoading ? "#475569" : GREEN,
                      color: "#fff",
                      fontWeight: 800,
                      cursor: checkoutLoading ? "wait" : "pointer",
                      fontSize: 15,
                    }}
                  >
                    Unlock My Appeal
                  </button>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 18, border: "1px solid #334155" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Essential</div>
                  <div style={{ color: "#f8fafc", fontSize: 26, fontWeight: 800, margin: "8px 0" }}>$399</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>/month — 10 appeals</div>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void startCheckout("essential", "subscription")}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      borderRadius: 10,
                      background: checkoutLoading ? "#475569" : GREEN,
                      color: "#fff",
                      fontWeight: 800,
                      cursor: checkoutLoading ? "wait" : "pointer",
                      fontSize: 15,
                    }}
                  >
                    Unlock My Appeal
                  </button>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 18, border: "1px solid #334155" }}>
                  <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Professional</div>
                  <div style={{ color: "#f8fafc", fontSize: 26, fontWeight: 800, margin: "8px 0" }}>$699</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>/month — 25 appeals</div>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void startCheckout("professional", "subscription")}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      borderRadius: 10,
                      background: checkoutLoading ? "#475569" : GREEN,
                      color: "#fff",
                      fontWeight: 800,
                      cursor: checkoutLoading ? "wait" : "pointer",
                      fontSize: 15,
                    }}
                  >
                    Unlock My Appeal
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
