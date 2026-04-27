"use client";

import type { CSSProperties } from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import { createClient } from "@/lib/supabase/browser";
import { formatPlanName, getPlanDetails } from "@/lib/billing/plan-details";
import { PAGE_BG_SLATE, TEXT_ON_SLATE, TEXT_MUTED_ON_SLATE } from "@/lib/theme/app-shell";

type Subscription = { plan: string; status: string; cancel_at_period_end?: boolean } | null;

type Usage = {
  usage_percentage: number;
  overage_count: number;
  appeals_generated_monthly: number;
  plan_limit: number;
  appeals_generated_weekly: number;
  appeals_generated_today: number;
};

export default function BillingManagementClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);
  const [usageStats, setUsageStats] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, usageRes] = await Promise.all([
        fetch(`/api/stripe/subscription/${encodeURIComponent(uid)}`, { credentials: "include" }),
        api.get<Usage>(`/api/usage/${encodeURIComponent(uid)}`),
      ]);
      if (subRes.status === 200) {
        const sub = (await subRes.json()) as Subscription;
        setSubscription(sub);
      } else {
        setSubscription(null);
      }
      setUsageStats(usageRes.data);
    } catch (err) {
      console.error("Error fetching billing data:", err);
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const { data: sessionData, error: se } = await supabase.auth.getSession();
        if (se || !sessionData.session?.user) {
          router.replace("/login");
          return;
        }
        const id = sessionData.session.user.id;
        if (!id) {
          router.replace("/pricing");
          return;
        }
        await fetchBillingData(id);
      } catch {
        setError("Failed to load billing information");
        setLoading(false);
      }
    })();
  }, [router, fetchBillingData]);

  const handleManageBilling = async () => {
    try {
      const { data } = await api.post<{ url: string }>("/api/stripe/create-portal", {});
      if (data?.url) window.location.href = data.url;
    } catch {
      window.alert("Error opening billing portal. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading billing information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button type="button" onClick={() => router.push("/pricing")} style={styles.button}>
          View Pricing
        </button>
      </div>
    );
  }

  const planDetails = subscription?.plan ? getPlanDetails(subscription.plan) : null;

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Billing & usage</h1>
      {subscription && (
        <div style={styles.card}>
          <h2 style={styles.subheading}>Current plan</h2>
          <p style={styles.muted}>
            {formatPlanName(subscription.plan)} — {subscription.status}
            {subscription.cancel_at_period_end ? " (cancels at period end)" : ""}
          </p>
          {planDetails && <p style={styles.muted}>{planDetails.description}</p>}
          <button type="button" onClick={() => void handleManageBilling()} style={styles.button}>
            Manage in Stripe
          </button>
        </div>
      )}
      {usageStats && (
        <div style={styles.card}>
          <h2 style={styles.subheading}>Usage</h2>
          <ul style={styles.list}>
            <li>Plan limit: {usageStats.plan_limit}</li>
            <li>Appeals (monthly): {usageStats.appeals_generated_monthly}</li>
            <li>Appeals (weekly): {usageStats.appeals_generated_weekly}</li>
            <li>Appeals (today): {usageStats.appeals_generated_today}</li>
            <li>Overage: {usageStats.overage_count}</li>
            <li>Utilization: {Math.round(usageStats.usage_percentage)}%</li>
          </ul>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 24,
    background: PAGE_BG_SLATE,
    minHeight: "100vh",
    color: TEXT_ON_SLATE,
  },
  heading: { fontSize: 24, marginBottom: 16 },
  subheading: { fontSize: 16, marginBottom: 8, color: TEXT_MUTED_ON_SLATE },
  card: { marginBottom: 24, padding: 16, background: "rgba(15,23,42,0.6)", borderRadius: 8 },
  muted: { color: TEXT_MUTED_ON_SLATE, fontSize: 14 },
  list: { margin: 0, paddingLeft: 20, color: TEXT_MUTED_ON_SLATE, fontSize: 14 },
  loading: { color: TEXT_MUTED_ON_SLATE },
  error: { color: "#fca5a5" },
  button: { marginTop: 12, padding: "8px 16px", cursor: "pointer" },
};
