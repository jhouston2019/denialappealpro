"use client";

import { useEffect } from "react";

/**
 * No fetch, no auth. Checkout success is configured to land on `/app?session_id=…`;
 * this route exists for legacy links and ends at the product.
 */
export default function CheckoutSuccessPage() {
  useEffect(() => {
    window.location.href = "/app";
  }, []);

  return (
    <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      <p>Redirecting…</p>
    </div>
  );
}
