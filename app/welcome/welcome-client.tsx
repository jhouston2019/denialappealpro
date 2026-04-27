"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  DAP_PRACTICE_PROFILE_KEY,
  DAP_RESUME_AFTER_PAYMENT_KEY,
  DAP_WIZARD_RESUME_KEY,
  type DapClaimDataForPreview,
  type DapPracticeProfileStored,
  type DapResumeAfterPaymentPayload,
} from "@/lib/dap/preview-flow";

type MeResponse = { user: { is_paid?: boolean | null; email?: string } };

type Msg = { kind: "ok" | "err" | "info"; text: string } | null;

type Props = { sessionId?: string; initialEmail?: string };

/**
 * Post-checkout landing: payment confirmed; user receives a recovery / magic link by email
 * (not password entry here). When session exists and is_paid, resume appeal or /start.
 */
export function WelcomeClient({ sessionId, initialEmail = "" }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [resendEmail, setResendEmail] = useState(() => (initialEmail || "").trim());
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const postPayRedirectDone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasResume(Boolean(sessionStorage.getItem(DAP_RESUME_AFTER_PAYMENT_KEY)));
  }, []);

  const resumeAppealIfPending = useCallback(async (): Promise<boolean> => {
    const raw = sessionStorage.getItem(DAP_RESUME_AFTER_PAYMENT_KEY);
    if (!raw) return false;
    let payload: DapResumeAfterPaymentPayload;
    try {
      payload = JSON.parse(raw) as DapResumeAfterPaymentPayload;
    } catch {
      return false;
    }
    if (!payload.claim_data || !payload.intake_snapshot || !payload.mode) return false;
    let claimForApi: DapClaimDataForPreview = { ...payload.claim_data };
    let practice: DapPracticeProfileStored | undefined = payload.practice_profile;
    if (!practice) {
      try {
        const pr = sessionStorage.getItem(DAP_PRACTICE_PROFILE_KEY);
        if (pr) {
          const p = JSON.parse(pr) as Partial<DapPracticeProfileStored>;
          const nm = String(p.provider_name || "").trim();
          const npi = String(p.provider_npi || "").replace(/\D/g, "");
          if (nm && npi.length === 10) {
            practice = {
              provider_name: nm,
              provider_npi: npi,
              ...(p.provider_address ? { provider_address: String(p.provider_address) } : {}),
              ...(p.provider_phone ? { provider_phone: String(p.provider_phone) } : {}),
            };
          }
        }
      } catch {
        /* keep */
      }
    }
    if (practice) {
      claimForApi = {
        ...claimForApi,
        provider_name: practice.provider_name,
        provider_npi: practice.provider_npi,
      };
    }
    try {
      const res = await fetch("/api/intake/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimForApi),
        credentials: "include",
      });
      const data = (await res.json()) as { appeal_id?: string; error?: string };
      if (res.ok && data.appeal_id) {
        sessionStorage.removeItem(DAP_RESUME_AFTER_PAYMENT_KEY);
        router.push(`/appeal/${data.appeal_id}`);
        return true;
      }
      const errText = (data.error || "").toLowerCase();
      if (
        res.status === 400 &&
        (errText.includes("required") || errText.includes("patient name") || errText.includes("npi"))
      ) {
        sessionStorage.setItem(
          DAP_WIZARD_RESUME_KEY,
          JSON.stringify({ intake: payload.intake_snapshot, mode: payload.mode })
        );
        sessionStorage.removeItem(DAP_RESUME_AFTER_PAYMENT_KEY);
        router.push("/start?dap_need_details=1");
        return true;
      }
    } catch {
      /* keep for retry */
    }
    return false;
  }, [router]);

  const runPaidUserRedirect = useCallback(async () => {
    if (postPayRedirectDone.current) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return;
    const me = (await res.json()) as MeResponse;
    if (me.user.is_paid !== true) return;
    if (postPayRedirectDone.current) return;
    const didResume = await resumeAppealIfPending();
    if (didResume) {
      postPayRedirectDone.current = true;
      return;
    }
    postPayRedirectDone.current = true;
    router.replace("/start");
  }, [supabase, router, resumeAppealIfPending]);

  useEffect(() => {
    void runPaidUserRedirect();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void runPaidUserRedirect();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, runPaidUserRedirect]);

  const resendAccessLink = async () => {
    if (!resendEmail.trim()) {
      setMsg({ kind: "err", text: "Enter the same email you used in Stripe checkout." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/send-access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });
      const out = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: out.error || "Could not send the link. Try again." });
        return;
      }
      setMsg({ kind: "ok", text: "We sent a new link to that address. Check your email." });
    } catch {
      setMsg({ kind: "err", text: "Request failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="dap-welcome-page"
      style={{ maxWidth: 520, margin: "40px auto", padding: "0 clamp(16px, 4vw, 24px)" }}
    >
      <h1 style={{ fontSize: "clamp(1.35rem, 4vw, 1.5rem)", fontWeight: 700, lineHeight: 1.2 }}>
        Payment confirmed
      </h1>
      <p style={{ color: "#475569", lineHeight: 1.6, fontSize: 16, marginTop: 12 }}>
        Check your email for a link to access your account. Use the same address you used in checkout.
      </p>
      {hasResume && (
        <p
          style={{
            color: "#0f172a",
            lineHeight: 1.5,
            fontSize: 15,
            marginTop: 20,
            padding: 16,
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Your appeal is being prepared. Click the link in your email to view it.
        </p>
      )}
      {sessionId && (
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 20 }}>
          Reference: <code style={{ fontSize: 12 }}>{sessionId}</code>
        </p>
      )}

      <div style={{ marginTop: 28, display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Email (for resending the link)</span>
          <input
            type="email"
            autoComplete="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="dap-welcome-input"
            style={{
              padding: "12px 14px",
              fontSize: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              maxWidth: "100%",
            }}
          />
        </label>
        {msg && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: msg.kind === "err" ? "#b91c1c" : msg.kind === "ok" ? "#15803d" : "#0f172a",
            }}
            role="status"
          >
            {msg.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => void resendAccessLink()}
          disabled={busy}
          style={{
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: 16,
            width: "100%",
            maxWidth: 400,
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Sending…" : "Resend access link"}
        </button>
      </div>
    </div>
  );
}
