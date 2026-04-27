"use client";

import { useEffect } from "react";

/**
 * After Stripe: send checkout session id to /app for server-side entitlement sync.
 */
export function SuccessClient() {
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (sessionId) {
      window.location.href = `/app?session_id=${encodeURIComponent(sessionId)}`;
    } else {
      window.location.href = "/app";
    }
  }, []);

  return null;
}
