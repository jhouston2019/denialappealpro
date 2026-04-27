"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const INK = "#1e293b";
const CHECK = "#22c55e";
const PAGE_BG = "#1e293b";

const BASE_FEATURES = [
  "AI-powered denial letter generation",
  "Automatic claim detail extraction (PDF, EOB, paste)",
  "CARC / RARC code-specific rebuttals",
  "Regulatory citations (NCCI, CMS, ERISA, ACA)",
  "PDF and Word export",
  "Appeal history dashboard",
];

type Props = {
  userEmail: string;
};

export default function PricingPageClient({ userEmail }: Props) {
  const [loading, setLoading] = useState(false);

  const singlePriceId = (process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE || "").trim();

  const handleSinglePayment = async () => {
    if (!singlePriceId) {
      window.alert(
        "Single-appeal checkout is not configured. Set NEXT_PUBLIC_STRIPE_PRICE_SINGLE to your $59 (5900¢) Stripe Price ID."
      );
      return;
    }
    if (!stripePromise) {
      window.alert("Stripe is not configured (set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_*_PRICE_ID).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "single",
          type: "payment" as const,
          price_id: singlePriceId,
        }),
        credentials: "include",
      });
      const out = (await response.json()) as { session_id?: string; error?: string };
      if (!response.ok) {
        window.alert(out.error || "Error creating checkout session.");
        return;
      }
      if (!out.session_id) {
        window.alert("No session returned.");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        window.alert("Stripe failed to load.");
        return;
      }
      const { error } = await stripe.redirectToCheckout({ sessionId: out.session_id });
      if (error) {
        console.error("Stripe error:", error);
        window.alert("Payment error: " + error.message);
      }
    } catch (e) {
      console.error("Single appeal checkout error:", e);
      window.alert("Error starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: "essential" | "professional" | "enterprise") => {
    if (!stripePromise) {
      window.alert("Stripe is not configured (set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_*_PRICE_ID).");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier, type: "subscription" }),
        credentials: "include",
      });
      const out = (await response.json()) as { session_id?: string; error?: string };
      if (!response.ok) {
        window.alert(out.error || "Error creating subscription.");
        return;
      }
      if (!out.session_id) {
        window.alert("No session returned.");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) {
        window.alert("Stripe failed to load.");
        return;
      }
      const { error } = await stripe.redirectToCheckout({ sessionId: out.session_id });
      if (error) {
        console.error("Stripe error:", error);
        window.alert("Payment error: " + error.message);
      }
    } catch (e) {
      console.error("Subscription error:", e);
      window.alert("Error creating subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dap-pricing-page" style={{ background: PAGE_BG }}>
      <header className="dap-pricing-hero">
        <h1>Turn Denials Into Revenue — In Minutes</h1>
        <p className="dap-pricing-sub">
          AI-powered appeal generation that extracts denial details, builds legally grounded letters, and gets your
          claims submission-ready fast.
        </p>
      </header>

      <div className="dap-pricing-inner">
        <div className="dap-pricing-email-card">
          <p className="dap-pricing-email-hint" style={{ marginTop: 0 }}>
            Signed in as <strong>{userEmail || "—"}</strong>
          </p>
        </div>

        <div className="dap-pricing-grid">
          {/* Single */}
          <article className="dap-pricing-card">
            <h2 className="dap-pricing-tier">Single</h2>
            <p className="dap-pricing-price">
              <span className="dap-pricing-amount">$59</span>
              <span className="dap-pricing-period">(one-time)</span>
            </p>
            <ul className="dap-pricing-features" style={{ color: INK }}>
              {[
                "1 appeal",
                ...BASE_FEATURES,
                "No subscription required",
              ].map((line) => (
                <li key={line}>
                  <span className="dap-pricing-check" style={{ color: CHECK }} aria-hidden>
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="dap-pricing-cta dap-pricing-cta--green"
              onClick={() => void handleSinglePayment()}
              disabled={loading}
            >
              {loading ? "Processing…" : "Start Single Appeal"}
            </button>
          </article>

          {/* Essential */}
          <article className="dap-pricing-card">
            <h2 className="dap-pricing-tier">Essential</h2>
            <p className="dap-pricing-price">
              <span className="dap-pricing-amount">$399</span>
              <span className="dap-pricing-period">/month — 10 appeals</span>
            </p>
            <ul className="dap-pricing-features" style={{ color: INK }}>
              {[
                "10 appeals per month",
                "Unused appeals roll over (up to 1 month)",
                ...BASE_FEATURES,
                "Priority processing",
              ].map((line) => (
                <li key={line}>
                  <span className="dap-pricing-check" style={{ color: CHECK }} aria-hidden>
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="dap-pricing-cta dap-pricing-cta--green"
              onClick={() => void handleSubscribe("essential")}
              disabled={loading}
            >
              {loading ? "Processing…" : "Start Essential Plan"}
            </button>
          </article>

          {/* Professional — featured */}
          <article className="dap-pricing-card dap-pricing-card--popular">
            <div className="dap-pricing-badge">Most Popular</div>
            <h2 className="dap-pricing-tier">Professional</h2>
            <p className="dap-pricing-price">
              <span className="dap-pricing-amount">$699</span>
              <span className="dap-pricing-period">/month — 25 appeals</span>
            </p>
            <ul className="dap-pricing-features" style={{ color: INK }}>
              {[
                "25 appeals per month",
                "Unused appeals roll over (up to 1 month)",
                ...BASE_FEATURES,
                "Priority processing",
                "Bulk PDF upload (up to 100 files)",
                "CSV / Excel batch processing",
              ].map((line) => (
                <li key={line}>
                  <span className="dap-pricing-check" style={{ color: CHECK }} aria-hidden>
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="dap-pricing-cta dap-pricing-cta--green"
              onClick={() => void handleSubscribe("professional")}
              disabled={loading}
            >
              {loading ? "Processing…" : "Start Professional Plan"}
            </button>
          </article>

          {/* Enterprise */}
          <article className="dap-pricing-card">
            <h2 className="dap-pricing-tier">Enterprise</h2>
            <p className="dap-pricing-price">
              <span className="dap-pricing-amount">$1,499</span>
              <span className="dap-pricing-period">/month — 75 appeals</span>
            </p>
            <ul className="dap-pricing-features" style={{ color: INK }}>
              {[
                "75 appeals per month",
                "Unused appeals roll over (up to 1 month)",
                ...BASE_FEATURES,
                "Priority processing",
                "Bulk PDF upload (up to 100 files)",
                "CSV / Excel batch processing",
                "Dedicated account support",
                "Custom payer templates",
              ].map((line) => (
                <li key={line}>
                  <span className="dap-pricing-check" style={{ color: CHECK }} aria-hidden>
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="dap-pricing-cta dap-pricing-cta--enterprise"
              onClick={() => void handleSubscribe("enterprise")}
              disabled={loading}
            >
              {loading ? "Processing…" : "Start Enterprise Plan"}
            </button>
          </article>
        </div>

        <p className="dap-pricing-trust">
          No contracts. Cancel anytime. Appeals generated in under 60 seconds.
        </p>
      </div>
    </div>
  );
}
