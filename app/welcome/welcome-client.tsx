"use client";

import { useEffect, useRef, useState } from "react";
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

/** Deduplicate React Strict Mode double effect (same session_id). */
const welcomeStartKeys = new Set<string>();

function pickTokenHashFromActionLink(href: string): string | null {
  const u = new URL(href);
  const fromSearch =
    u.searchParams.get("token_hash")?.trim() || u.searchParams.get("token")?.trim() || null;
  if (fromSearch) return fromSearch;
  if (u.hash.length > 1) {
    const h = new URLSearchParams(u.hash.replace(/^#/, ""));
    return h.get("token_hash")?.trim() || h.get("token")?.trim() || null;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Post-checkout: confirm Stripe session server-side, complete magic-link OTP in-browser,
 * then resume appeal or /start. No form and no email step.
 */
export function WelcomeClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [uiState, setUiState] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const postPayRedirectDone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionId = new URLSearchParams(window.location.search).get("session_id")?.trim() ?? "";
    if (!sessionId) {
      setErrorMessage("Missing checkout session. You can start from pricing or your dashboard.");
      setUiState("error");
      return;
    }
    if (welcomeStartKeys.has(sessionId)) return;
    welcomeStartKeys.add(sessionId);

    void (async () => {
      const fail = (msg: string) => {
        setErrorMessage(msg);
        setUiState("error");
        welcomeStartKeys.delete(sessionId);
      };

      let res: Response;
      let payload: { link?: string; error?: string };
      try {
        res = await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
          credentials: "include",
        });
        payload = (await res.json()) as { link?: string; error?: string };
      } catch {
        return fail("Could not reach the server. Check your connection and try again.");
      }

      if (!res.ok || !payload.link) {
        return fail(payload.error || "Could not verify your payment. Try again or contact support.");
      }

      const tokenHash = pickTokenHashFromActionLink(payload.link);
      if (!tokenHash) {
        return fail("Sign-in link was invalid. Please use the success link from checkout again.");
      }

      const { error: otpErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (otpErr) {
        return fail(otpErr.message || "Sign-in failed. Please try again.");
      }

      if (postPayRedirectDone.current) return;
      if (sessionStorage.getItem(DAP_RESUME_AFTER_PAYMENT_KEY)) {
        const didResume = await resumeAppealWithRetries(router);
        if (didResume) {
          postPayRedirectDone.current = true;
          return;
        }
        postPayRedirectDone.current = true;
        router.replace("/start");
        return;
      }
      postPayRedirectDone.current = true;
      router.replace("/start");
    })();
  }, [router, supabase]);

  return (
    <div
      className="dap-welcome-page"
      style={{ maxWidth: 520, margin: "40px auto", padding: "0 clamp(16px, 4vw, 24px)" }}
    >
      {uiState === "loading" && (
        <p style={{ color: "#0f172a", lineHeight: 1.6, fontSize: 17, margin: 0 }}>
          Setting up your account...
        </p>
      )}
      {uiState === "error" && errorMessage && (
        <p style={{ color: "#0f172a", lineHeight: 1.6, fontSize: 17, margin: 0 }}>{errorMessage}</p>
      )}
    </div>
  );
}

async function resumeAppealWithRetries(router: ReturnType<typeof useRouter>): Promise<boolean> {
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

  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(800 * attempt);
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
      if (res.status === 403 && attempt < maxAttempts - 1) {
        continue;
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
      /* try next attempt */
    }
  }
  return false;
}
