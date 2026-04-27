"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing your payment…");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      router.replace("/app");
      return;
    }

    (async () => {
      try {
        setStatus("Setting up your account…");

        const res = await fetch("/api/create-session-from-stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          console.error("[success]", data.error);
          // Still try to continue — webhook may have already set paid state
        }

        setStatus("Almost there…");
        const supabase = createClient();
        await supabase.auth.refreshSession();

        const rawResume = sessionStorage.getItem("dap_resume_after_payment");
        const hasResume =
          rawResume != null || sessionStorage.getItem("dap_wizard_resume") != null;

        router.replace(hasResume ? "/start?resumed=1" : "/app");
      } catch (err) {
        console.error("[success] unexpected", err);
        router.replace("/app");
      }
    })();
  }, [router, searchParams]);

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
