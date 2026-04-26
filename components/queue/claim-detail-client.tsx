"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api-client";
import { ApiError } from "@/lib/api/api-error";

type Claim = Record<string, unknown> & {
  claim_id?: string;
  amount?: number;
  payer?: string;
  queue_status?: string;
  patient_id?: string;
  provider_name?: string;
  provider_npi?: string;
  date_of_service?: string;
  denial_code?: string;
  cpt_codes?: string;
  diagnosis_code?: string;
  denial_reason?: string;
  payment_status?: string;
  queue_notes?: string | null;
  generated_letter_text?: string | null;
  status?: string;
  appeal_id?: string;
  appeal_tracking_status?: string;
  tracking_updated_at?: string | null;
  payer_fax?: string | null;
  appeal_generation_kind?: string;
  follow_up_eligible?: boolean;
  follow_up_reason?: string;
  submitted_to_payer_at?: string | null;
  has_letter?: boolean;
  history?: { id: number; event_type: string; message: string | null; created_at: string | null }[];
};

type PostGen = {
  claim_amount?: number;
  recovery_potential_estimate?: number;
  free_trial_remaining?: number | null;
};

type Usage = Record<string, unknown>;

function getApiErrorMessage(e: unknown) {
  if (e instanceof ApiError) {
    const d = e.response.data;
    if (d && typeof d === "object" && "error" in d) return String((d as { error: string }).error);
  }
  return "Request failed";
}

export default function ClaimDetailClient() {
  const params = useParams();
  const appealId = String(params.appealId || "");
  const searchParams = useSearchParams();
  const highlightGen = searchParams.get("gen") === "1";

  const [claim, setClaim] = useState<Claim | null>(null);
  const [notes, setNotes] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<Usage | null>(null);
  const [postGen, setPostGen] = useState<PostGen | null>(null);
  const [trackingStatus, setTrackingStatus] = useState("pending");
  const [payerFax, setPayerFax] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get<{ claim: Claim }>(`/api/queue/${appealId}`);
    const c = data.claim;
    setClaim(c);
    setNotes(String(c.queue_notes || ""));
    setLetter(String(c.generated_letter_text || ""));
    setPaymentStatus((String(c.payment_status || "unpaid")).toLowerCase());
    setTrackingStatus(String(c.appeal_tracking_status || "pending"));
    setPayerFax(String(c.payer_fax || ""));
    setLoading(false);
  }, [appealId]);

  useEffect(() => {
    setLoading(true);
    void load().catch((e) => {
      setErr(getApiErrorMessage(e));
      setLoading(false);
    });
  }, [load]);

  const saveNotes = async () => {
    await api.patch(`/api/queue/${appealId}`, { queue_notes: notes });
  };

  const runGenerate = async () => {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post<{ claim: Claim; post_generation?: PostGen; usage?: unknown }>(`/api/queue/${appealId}/generate`, {});
      setClaim(data.claim);
      setLetter(String(data.claim.generated_letter_text || ""));
      if (data.post_generation) {
        setPostGen(data.post_generation);
      }
    } catch (e) {
      if (e instanceof ApiError && e.response.status === 402) {
        const d = e.response.data;
        if (d && typeof d === "object" && "usage" in d) {
          setPaywallUsage((d as { usage: Usage }).usage);
        } else {
          setPaywallUsage(null);
        }
        setPaywallOpen(true);
      } else {
        setErr(getApiErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const saveLetter = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch<{ claim: Claim }>(`/api/queue/${appealId}`, { generated_letter_text: letter });
      setClaim(data.claim);
    } finally {
      setBusy(false);
    }
  };

  const rebuildPdf = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ claim: Claim }>(`/api/queue/${appealId}/rebuild-pdf`, {});
      setClaim(data.claim);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copyAppealText = async () => {
    const t = (letter || "").replace(/\r\n/g, "\n").trim();
    if (!t) {
      setErr("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      setErr("Clipboard not available");
    }
  };

  const markSubmitted = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch<{ claim: Claim }>(`/api/queue/${appealId}`, {
        queue_status: "submitted",
        appeal_tracking_status: "submitted",
      });
      setClaim(data.claim);
      setTrackingStatus(String(data.claim.appeal_tracking_status || "submitted"));
    } finally {
      setBusy(false);
    }
  };

  const runGenerateFollowUp = async () => {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post<{ claim: Claim }>(`/api/queue/${appealId}/follow-up`, { days_no_response: 30 });
      setClaim(data.claim);
      setLetter(String(data.claim.generated_letter_text || ""));
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveTracking = async (appeal_tracking_status: string) => {
    try {
      const { data } = await api.patch<{ claim: Claim }>(`/api/queue/${appealId}`, { appeal_tracking_status });
      setClaim(data.claim);
      setTrackingStatus(String(data.claim.appeal_tracking_status || appeal_tracking_status));
    } catch {
      setErr("Could not save tracking status");
    }
  };

  const savePayerFax = async () => {
    try {
      const { data } = await api.patch<{ claim: Claim }>(`/api/queue/${appealId}`, { payer_fax: payerFax });
      setClaim(data.claim);
    } catch {
      setErr("Could not save fax number");
    }
  };

  const downloadExport = async (mode: "appeal" | "merged" | "zip") => {
    setErr("");
    try {
      const { data: blob } = await api.get<Blob>(`/api/queue/${appealId}/export?mode=${mode}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cid = String(claim?.claim_id || "export");
      a.download =
        mode === "zip" ? `appeal_export_${cid}.zip` : mode === "merged" ? `appeal_with_fax_${cid}.pdf` : `appeal_${cid}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  };

  if (loading || !claim) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  const canGenerate = claim.status !== "completed";
  const hasPdf = Boolean(claim.has_letter);

  return (
    <div style={{ padding: "16px 20px", maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      {paywallOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              maxWidth: 400,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Limit reached</h2>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#334155" }}>
              Upgrade or add credits to continue generating appeals.{" "}
              {paywallUsage?.subscription_tier != null && (
                <span style={{ display: "block", marginTop: 8, fontSize: 13, color: "#64748b" }}>Check your current plan in billing.</span>
              )}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/pricing"
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  background: "#0f766e",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                View plans
              </Link>
              <button
                type="button"
                onClick={() => setPaywallOpen(false)}
                style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {postGen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              maxWidth: 440,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Appeal generated</h2>
            <p style={{ margin: "0 0 8px", fontSize: 15, color: "#334155" }}>
              <strong>Claim value:</strong> $
              {Number(postGen.claim_amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 15, color: "#334155" }}>
              <strong>Estimated recovery potential (~35%):</strong> $
              {Number(postGen.recovery_potential_estimate || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {postGen.free_trial_remaining != null && (
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b" }}>
                Free generations remaining: {postGen.free_trial_remaining} of 3
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href="/pricing"
                style={{
                  display: "inline-block",
                  padding: "10px 18px",
                  background: "#0f766e",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                Upgrade plan
              </Link>
              <button
                type="button"
                onClick={() => setPostGen(null)}
                style={{ padding: "10px 18px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
              >
                Continue to appeal
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ margin: "0 0 12px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard" style={{ color: "#1d4ed8" }}>
          ← Tracking dashboard
        </Link>
        <Link href="/queue" style={{ color: "#1d4ed8" }}>
          Queue / batch
        </Link>
      </p>
      <h1 style={{ margin: "0 0 8px", fontSize: 20 }}>Claim {claim.claim_id}</h1>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "#444" }}>
        {claim.payer} · ${Number(claim.amount).toFixed(2)} · {claim.queue_status}
      </p>

      {highlightGen && canGenerate && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffc107", padding: 8, marginBottom: 12, fontSize: 13 }}>
          Ready to generate — uses your subscription, credits, or up to 3 free onboarding generations.
        </div>
      )}
      {err && <p style={{ color: "#b00020", fontSize: 14 }}>{err}</p>}

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Claim data</h2>
        <table style={{ fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {(
              [
                ["Patient ID", claim.patient_id],
                ["Provider", claim.provider_name],
                ["NPI", claim.provider_npi],
                ["DOS", claim.date_of_service],
                ["Denial code", claim.denial_code],
                ["CPT", claim.cpt_codes],
                ["ICD", claim.diagnosis_code],
                ["Denial reason", claim.denial_reason],
              ] as const
            ).map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "4px 12px 4px 0", color: "#555", verticalAlign: "top" }}>{k}</td>
                <td style={{ padding: "4px 0" }}>{v != null && v !== "" ? String(v) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Payment / recovery status</h2>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: "#555" }}>Track payer outcome (Pending → Submitted → Paid).</p>
        <select
          value={paymentStatus}
          onChange={async (e) => {
            const v = e.target.value;
            setPaymentStatus(v);
            try {
              const { data } = await api.patch<{ claim: Claim }>(`/api/queue/${appealId}`, { payment_status: v });
              setClaim(data.claim);
            } catch {
              setErr("Could not save payment status");
            }
          }}
          style={{ padding: 6, fontSize: 13, minWidth: 200 }}
        >
          <option value="pending">Pending</option>
          <option value="unpaid">Unpaid</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
        </select>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Appeal tracking</h2>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>Payer submission lifecycle (separate from payment status above).</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <select
            value={trackingStatus}
            disabled={busy}
            onChange={(e) => void saveTracking(e.target.value)}
            style={{ padding: 6, fontSize: 13, minWidth: 200 }}
          >
            <option value="generated">Generated</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          {claim.tracking_updated_at && (
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Last updated: {String(claim.tracking_updated_at).replace("T", " ").slice(0, 19)}
            </span>
          )}
        </div>
        <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
          Payer fax # (printed on fax cover sheet)
          <input
            value={payerFax}
            onChange={(e) => setPayerFax(e.target.value)}
            onBlur={() => void savePayerFax()}
            placeholder="e.g. 877-842-3210"
            style={{ display: "block", width: "100%", maxWidth: 320, marginTop: 4, padding: 8, fontSize: 13 }}
          />
        </label>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", fontSize: 13 }}
        />
        <button type="button" onClick={() => void saveNotes()} style={{ marginTop: 6, padding: "4px 10px" }}>
          Save notes
        </button>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Appeal</h2>
        {claim.appeal_generation_kind === "follow_up" && (
          <p style={{ fontSize: 13, color: "#0f766e", marginBottom: 10, fontWeight: 600 }}>Second-Level Appeal (on file)</p>
        )}
        {claim.follow_up_eligible && claim.appeal_generation_kind !== "follow_up" && (
          <div style={{ marginBottom: 12, padding: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#14532d" }}>
              Follow-up available: {String(claim.follow_up_reason || "")}
            </p>
            <button type="button" disabled={busy} onClick={() => void runGenerateFollowUp()} style={{ padding: "8px 14px" }}>
              {busy ? "Working…" : "Generate Follow-Up Appeal"}
            </button>
          </div>
        )}
        {!claim.follow_up_eligible && claim.appeal_generation_kind !== "follow_up" && (claim.appeal_tracking_status === "denied" || claim.submitted_to_payer_at) && (
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Follow-up: {String(claim.follow_up_reason || "—")}</p>
        )}
        {canGenerate && (
          <button type="button" disabled={busy} onClick={() => void runGenerate()} style={{ padding: "8px 14px", marginBottom: 12 }}>
            {busy ? "Working…" : "Generate structured appeal"}
          </button>
        )}
        {!canGenerate && (
          <>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={14}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: 12 }}
            />
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" disabled={busy} onClick={() => void copyAppealText()} style={{ padding: "6px 12px" }}>
                Copy appeal
              </button>
              <button type="button" disabled={busy} onClick={() => void saveLetter()} style={{ padding: "6px 12px" }}>
                Save edits
              </button>
              <button type="button" disabled={busy} onClick={() => void rebuildPdf()} style={{ padding: "6px 12px" }}>
                Approve &amp; rebuild PDF
              </button>
              {hasPdf && (
                <>
                  <button type="button" disabled={busy} onClick={() => void downloadExport("appeal")} style={{ padding: "6px 12px" }}>
                    Download appeal only
                  </button>
                  <button type="button" disabled={busy} onClick={() => void downloadExport("merged")} style={{ padding: "6px 12px" }}>
                    Appeal + fax cover (PDF)
                  </button>
                  <button type="button" disabled={busy} onClick={() => void downloadExport("zip")} style={{ padding: "6px 12px" }}>
                    Appeal + fax (ZIP)
                  </button>
                  <a
                    href={`/api/queue/${appealId}/export?mode=appeal`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "6px 12px", border: "1px solid #94a3b8", color: "#334155", textDecoration: "none", fontSize: 13 }}
                  >
                    Open PDF (new tab)
                  </a>
                </>
              )}
              <button
                type="button"
                disabled={busy || claim.queue_status === "submitted"}
                onClick={() => void markSubmitted()}
                style={{ padding: "6px 12px" }}
              >
                Mark submitted
              </button>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>History</h2>
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {(claim.history || []).map((h) => (
            <li key={h.id} style={{ marginBottom: 6 }}>
              <strong>{h.event_type}</strong>
              {h.message ? ` — ${h.message}` : ""}
              <span style={{ color: "#777" }}> ({h.created_at})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
