"use client";

import { useEffect, useRef } from "react";

/**
 * Stripe return: establish server session, then block until /api/auth/me sees the user, then /app.
 */
export function SuccessClient() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");

      if (!sessionId) {
        window.location.href = "/pricing";
        return;
      }

      // attempt session creation, but DO NOT trust response
      await fetch("/api/auth/create-session-from-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
        credentials: "include",
      });

      let attempts = 0;
      while (attempts < 10) {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const data = (await res.json()) as { user?: { id?: string }; error?: string };

        if (data?.user?.id) {
          window.location.href = "/app";
          return;
        }

        await new Promise((r) => setTimeout(r, 300));
        attempts += 1;
      }

      document.body.innerHTML = "Authentication failed. Please refresh.";
    };

    void run();
  }, []);

  return null;
}
