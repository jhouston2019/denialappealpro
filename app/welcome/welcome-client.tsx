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

/**
 * Post-checkout: payment confirmed; access via magic link in email.
 * After sign-in, resume an appeal or go to /start.
 */
export function WelcomeClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const postPayRedirectDone = useRef(false);

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

  const redirectAfterSignIn = useCallback(async () => {
    if (postPayRedirectDone.current) return;
    if (sessionStorage.getItem(DAP_RESUME_AFTER_PAYMENT_KEY)) {
      const didResume = await resumeAppealIfPending();
      if (didResume) {
        postPayRedirectDone.current = true;
        return;
      }
    } else {
      postPayRedirectDone.current = true;
      router.replace("/start");
    }
  }, [router, resumeAppealIfPending]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void redirectAfterSignIn();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, redirectAfterSignIn]);

  return (
    <div
      className="dap-welcome-page"
      style={{ maxWidth: 520, margin: "40px auto", padding: "0 clamp(16px, 4vw, 24px)" }}
    >
      <p style={{ color: "#0f172a", lineHeight: 1.6, fontSize: 17, margin: 0 }}>
        Payment confirmed. Check your email for your access link.
      </p>
    </div>
  );
}
