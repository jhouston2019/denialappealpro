"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  sessionId: string | null;
};

/**
 * All browser-only APIs (sessionStorage, Supabase browser client) run after mount.
 */
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
        }

        setStatus("Almost there…");
        const supabase = createClient();
        await supabase.auth.refreshSession();

        const rawResume =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("dap_resume_after_payment")
            : null;
        const wizard =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("dap_wizard_resume")
            : null;
        const hasResume = rawResume != null || wizard != null;

        router.replace(hasResume ? "/start?resumed=1" : "/app");
      } catch (err) {
        console.error("[success] unexpected", err);
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
