"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  sessionId: string | null;
};

async function pollVerifyPayment(maxMs = 10000, intervalMs = 1000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch("/api/verify-payment", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { is_paid?: boolean };
        if (data.is_paid === true) return true;
      }
    } catch {
      // network hiccup — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export function SuccessClient({ sessionId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("Processing your payment…");

  useEffect(() => {
    if (!sessionId) {
      router.replace("/app");
      return;
    }

    (async () => {
      try {
        // Step 1: Create or resolve account from Stripe session
        setStatus("Setting up your account…");
        const res = await fetch("/api/auth/create-session-from-stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        let createSessionData: {
          error?: string;
          sign_in_token?: string;
          sign_in_email?: string;
        } = {};
        try {
          createSessionData = await res.json();
        } catch {
          // ignore parse error
        }
        if (!res.ok) {
          console.error("[success] create-session-from-stripe failed", createSessionData.error);
        }

        // Step 2: Establish browser session
        setStatus("Establishing your session…");
        const supabase = createClient();

        if (createSessionData?.sign_in_token) {
          await supabase.auth.verifyOtp({
            token_hash: createSessionData.sign_in_token,
            type: "magiclink",
          });
        } else {
          await supabase.auth.refreshSession();
        }

        // Step 3: Poll until is_paid is confirmed
        setStatus("Confirming your payment…");
        const paid = await pollVerifyPayment(10000, 1000);

        if (!paid) {
          console.warn("[success] is_paid not confirmed within timeout — routing to /app anyway");
        }

        // Step 4: Read resume keys
        const rawResume = window.sessionStorage.getItem("dap_resume_after_payment");
        const wizard = window.sessionStorage.getItem("dap_wizard_resume");
        const hasResume = rawResume != null || wizard != null;

        // Step 5: Route
        setStatus("Redirecting…");
        router.replace(hasResume ? "/start?dap_need_details=1" : "/app");
      } catch (err) {
        console.error("[success] unexpected error", err);
        router.replace("/app");
      }
    })();
  }, [router, sessionId]);

  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 18 }}>{status}</p>
    </div>
  );
}
