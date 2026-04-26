"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api-client";
import { ApiError } from "@/lib/api/api-error";
import { useAuth } from "@/hooks/use-auth";
import { PAGE_BG_SLATE, TEXT_MUTED_ON_SLATE, TEXT_ON_SLATE } from "@/lib/theme/app-shell";
import RecoveryClaimsTable, { type QueueRow } from "@/components/queue/recovery-claims-table";

type Metrics = {
  total_in_queue: number;
  processed_today: number;
  added_today: number;
  revenue_at_risk?: number;
  revenue_recovered?: number;
  appeals_processed?: number;
  success_rate?: number;
  usage?: {
    plan_usage_label?: string;
    soft_grace_remaining?: number | null;
    plan_limit?: number;
    usage_percentage?: number;
    at_hard_cap?: boolean;
    upgrade_message?: string;
    subscription_tier?: string | null;
    free_trial_remaining?: number;
    free_trial_label?: string;
    free_trial_used?: number;
  };
};

export default function DenialQueue({ variant = "queue" }: { variant?: "queue" | "dashboard" }) {
  const router = useRouter();
  const { markQueueViewed, newDenialsBanner, newDenialsDollarValue } = useAuth();
  const isDashboard = variant === "dashboard";
  const [claims, setClaims] = useState<QueueRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotal, setQueueTotal] = useState<number | null>(null);
  const queueLimit = 25;
  const [batchOpen, setBatchOpen] = useState(() => isDashboard);
  const [batchRows, setBatchRows] = useState("");
  const [defaults, setDefaults] = useState({
    provider_name: "",
    provider_npi: "",
    patient_id: "",
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchMsg, setBatchMsg] = useState("");
  const [appealZipCsv, setAppealZipCsv] = useState<File | null>(null);
  const [appealZipJobId, setAppealZipJobId] = useState<string | null>(null);
  const [zipStatus, setZipStatus] = useState<Record<string, unknown> | null>(null);
  const [appealZipDoneId, setAppealZipDoneId] = useState<string | null>(null);
  const [appealZipBusy, setAppealZipBusy] = useState(false);
  const [appealZipErr, setAppealZipErr] = useState("");

  const loadQueuePageParallel = useCallback(
    async (shouldCommit: () => boolean = () => true) => {
      setListLoading(true);
      setMetricsLoading(true);
      setCountLoading(true);

      const queueP = api.get<{ claims?: QueueRow[] }>(`/api/queue?limit=25&page=${queuePage}`);
      const metricsP = api.get<Metrics>("/api/queue/metrics");
      const countP = api.get<{ total?: number }>("/api/queue/count");

      await Promise.all([
        queueP
          .then((queueRes) => {
            if (shouldCommit()) setClaims((queueRes.data.claims as QueueRow[]) ?? []);
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            if (shouldCommit()) setListLoading(false);
          }),
        metricsP
          .then((metricsRes) => {
            if (shouldCommit()) setMetrics(metricsRes.data);
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            if (shouldCommit()) setMetricsLoading(false);
          }),
        countP
          .then((countRes) => {
            if (!shouldCommit()) return;
            const t = countRes.data?.total;
            setQueueTotal(typeof t === "number" ? t : null);
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            if (shouldCommit()) setCountLoading(false);
          }),
      ]);
    },
    [queuePage]
  );

  useEffect(() => {
    let alive = true;
    void loadQueuePageParallel(() => alive);
    return () => {
      alive = false;
    };
  }, [loadQueuePageParallel]);

  useEffect(() => {
    void markQueueViewed();
  }, [markQueueViewed]);

  const processedClaims = useMemo(
    () =>
      (claims || []).map((a) => ({
        ...a,
        shortId: String(a.appeal_id ?? a.id ?? "").slice(0, 8),
      })),
    [claims]
  );

  const refreshQueueAndMetrics = useCallback(() => loadQueuePageParallel(() => true), [loadQueuePageParallel]);

  useEffect(() => {
    if (!appealZipJobId) return undefined;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let errorCount = 0;
    const MAX_ERRORS = 5;

    const tick = async () => {
      try {
        const res = await api.get<Record<string, unknown>>(`/api/queue/zip-status/${appealZipJobId}`);

        if (!isMounted) return;

        errorCount = 0;
        const data = res.data;

        setZipStatus((prev) => {
          if (
            prev &&
            prev.status === data?.status &&
            prev.current === data?.current &&
            prev.total === data?.total &&
            prev.ok_count === data?.ok_count &&
            prev.error === data?.error
          ) {
            return prev;
          }
          return data;
        });

        if (data?.status === "done" || data?.status === "error") {
          if (intervalId != null) clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Zip polling error:", err);
        errorCount += 1;
        if (errorCount >= MAX_ERRORS && intervalId != null) {
          clearInterval(intervalId);
          console.error("Zip polling stopped after repeated failures");
        }
      }
    };

    intervalId = setInterval(tick, 3000);
    void tick();

    return () => {
      isMounted = false;
      if (intervalId != null) clearInterval(intervalId);
    };
  }, [appealZipJobId]);

  useEffect(() => {
    if (!zipStatus || !appealZipJobId) return;
    const s = zipStatus.status;
    if (s === "error") {
      setAppealZipErr(String(zipStatus.error || "Batch failed"));
      setAppealZipBusy(false);
      setAppealZipJobId(null);
    } else if (s === "done") {
      setAppealZipDoneId(appealZipJobId);
      setAppealZipJobId(null);
      setAppealZipBusy(false);
    }
  }, [zipStatus, appealZipJobId]);

  const submitBatchJson = async () => {
    setBatchMsg("");
    let rows: unknown;
    try {
      rows = JSON.parse(batchRows || "[]");
    } catch {
      setBatchMsg("Invalid JSON");
      return;
    }
    if (!Array.isArray(rows)) {
      setBatchMsg("Rows must be a JSON array");
      return;
    }
    try {
      const { data } = await api.post<{ created_count?: number; errors?: unknown[] }>("/api/queue/batch", { rows, defaults });
      setBatchMsg(`Created ${data.created_count}. Errors: ${data.errors?.length || 0}`);
      setBatchRows("");
      refreshQueueAndMetrics();
    } catch (e) {
      const msg = e instanceof ApiError && e.response.data && typeof e.response.data === "object" && "error" in e.response.data
        ? String((e.response.data as { error?: string }).error)
        : "Batch failed";
      setBatchMsg(msg);
    }
  };

  const submitBatchCsv = async () => {
    if (!csvFile) {
      setBatchMsg("Choose a CSV file");
      return;
    }
    setBatchMsg("");
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("defaults", JSON.stringify(defaults));
      const { data } = await api.post<{ created_count?: number; errors?: unknown[] }>("/api/queue/batch", fd);
      setBatchMsg(`Created ${data.created_count}. Errors: ${data.errors?.length || 0}`);
      setCsvFile(null);
      refreshQueueAndMetrics();
    } catch (e) {
      const msg = e instanceof ApiError && e.response.data && typeof e.response.data === "object" && "error" in e.response.data
        ? String((e.response.data as { error?: string }).error)
        : "Upload failed";
      setBatchMsg(msg);
    }
  };

  const startBatchAppealZip = async () => {
    if (!appealZipCsv) {
      setAppealZipErr("Choose a CSV for batch appeal generation");
      return;
    }
    setAppealZipErr("");
    setAppealZipBusy(true);
    setAppealZipDoneId(null);
    setZipStatus(null);
    try {
      const fd = new FormData();
      fd.append("file", appealZipCsv);
      fd.append("defaults", JSON.stringify(defaults));
      const { data } = await api.post<{ job_id: string }>("/api/queue/batch-appeals", fd);
      setAppealZipJobId(data.job_id);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError && e.response.data && typeof e.response.data === "object" && "error" in e.response.data
          ? String((e.response.data as { error?: string }).error)
          : null;
      setAppealZipErr(msg || "Could not start batch");
      setAppealZipBusy(false);
    }
  };

  const downloadAppealZip = async () => {
    if (!appealZipDoneId) return;
    try {
      const { data: blob } = await api.get<Blob>(`/api/queue/batch-appeals/${appealZipDoneId}/zip`, { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appeals_batch_${Date.now()}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError && e.response.data && typeof e.response.data === "object" && "error" in e.response.data
          ? String((e.response.data as { error?: string }).error)
          : null;
      setAppealZipErr(msg || "Download failed");
    }
  };

  const countKnown = typeof queueTotal === "number";
  const totalPages = countKnown ? Math.max(1, Math.ceil(queueTotal / queueLimit)) : null;
  const canNext = countKnown ? queuePage * queueLimit < queueTotal : claims.length === queueLimit;
  const canPrev = queuePage > 1;
  const paginationTotalHint = countLoading || (!countKnown && canNext);

  const queuePagination =
    canPrev || canNext
      ? {
          page: queuePage,
          totalPages,
          totalClaims: queueTotal,
          countKnown,
          paginationTotalHint,
          canPrev,
          canNext,
          onPrev: () => setQueuePage((p) => Math.max(1, p - 1)),
          onNext: () => setQueuePage((p) => p + 1),
        }
      : undefined;
  const pct =
    metrics && metrics.added_today > 0
      ? Math.min(100, Math.round((metrics.processed_today / metrics.added_today) * 100))
      : (metrics?.processed_today ?? 0) > 0
        ? 100
        : 0;

  const sessionGoal = 10;
  const claimsTowardGoal = metrics ? Math.min(metrics.total_in_queue || 0, sessionGoal) : 0;
  const sessionPct = Math.min(100, Math.round((claimsTowardGoal / sessionGoal) * 100));

  return (
    <div
      style={{
        padding: "16px 20px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        background: PAGE_BG_SLATE,
        minHeight: "calc(100vh - 60px)",
        color: TEXT_ON_SLATE,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: TEXT_ON_SLATE }}>{isDashboard ? "Dashboard" : "Denial Queue"}</h1>
          {isDashboard && (
            <p style={{ margin: "6px 0 0", fontSize: 14, color: TEXT_MUTED_ON_SLATE }}>
              Denial queue — your processed claims and intake pipeline
            </p>
          )}
        </div>
        <button type="button" onClick={() => setBatchOpen((o) => !o)} style={{ padding: "6px 12px", cursor: "pointer" }}>
          {batchOpen ? "Hide batch upload" : "Batch upload"}
        </button>
      </div>

      {(newDenialsBanner ?? 0) > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            padding: 12,
            borderRadius: 6,
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14 }}>
            <strong>New denials since last session:</strong> {newDenialsBanner} claim
            {newDenialsBanner === 1 ? "" : "s"}
            {typeof newDenialsDollarValue === "number" && (
              <span style={{ marginLeft: 8 }}>
                (~$
                {Number(newDenialsDollarValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at stake)
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => router.push("/queue")}
              style={{ padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
            >
              Process claims
            </button>
            <button type="button" onClick={() => void markQueueViewed()} style={{ padding: "8px 12px", cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {metricsLoading && !metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 16,
            marginBottom: 16,
          }}
          aria-busy
          aria-label="Loading queue metrics"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ border: "1px solid #e5e7eb", padding: 10, borderRadius: 4, background: "#f9fafb" }}>
              <div style={{ height: 12, width: "72%", background: "#e5e7eb", borderRadius: 3, marginBottom: 10 }} />
              <div style={{ height: 22, width: "45%", background: "#e5e7eb", borderRadius: 3 }} />
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 16,
            marginBottom: 16,
            opacity: metricsLoading ? 0.65 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Total in queue</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.total_in_queue}</div>
          </div>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Processed today</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {metrics.processed_today}/{metrics.added_today || "—"}
            </div>
          </div>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Revenue at risk</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>${(metrics.revenue_at_risk ?? 0).toLocaleString()}</div>
          </div>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Revenue recovered</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>${(metrics.revenue_recovered ?? 0).toLocaleString()}</div>
          </div>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Appeals processed</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.appeals_processed ?? 0}</div>
          </div>
          <div style={{ border: "1px solid #ccc", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#555" }}>Success rate</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.success_rate ?? 0}%</div>
          </div>
        </div>
      )}

      {metrics?.usage?.plan_usage_label && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Plan usage: {metrics.usage.plan_usage_label} appeals this period
            {metrics.usage.soft_grace_remaining != null && (metrics.usage.plan_limit ?? 0) > 0 && (
              <span style={{ color: "#64748b", marginLeft: 8 }}>(grace remaining: {metrics.usage.soft_grace_remaining})</span>
            )}
          </div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, maxWidth: 360 }}>
            <div
              style={{
                height: 8,
                width: `${Math.min(100, metrics.usage.usage_percentage || 0)}%`,
                background: metrics.usage.at_hard_cap ? "#dc2626" : "#0f766e",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      )}

      {metrics?.usage?.upgrade_message && (
        <div
          style={{
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {metrics.usage.upgrade_message}{" "}
          <Link href="/pricing" style={{ fontWeight: 600 }}>
            View plans
          </Link>
        </div>
      )}

      {metrics?.usage && !metrics.usage.subscription_tier && typeof metrics.usage.free_trial_remaining === "number" && (
        <div
          style={{
            border: "1px solid #34d399",
            background: "#ecfdf5",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
            color: "#065f46",
          }}
        >
          <strong>3 free claims offer:</strong> {metrics.usage.free_trial_label || `${metrics.usage.free_trial_used}/3 used`}.
          {metrics.usage.free_trial_remaining > 0
            ? ` ${metrics.usage.free_trial_remaining} free generation(s) left — then choose a plan.`
            : " Free generations used — upgrade to continue."}{" "}
          <Link href="/pricing" style={{ fontWeight: 600, color: "#047857" }}>
            Upgrade
          </Link>
        </div>
      )}

      {metrics && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Today&apos;s queue: {metrics.added_today} claims | Processed: {metrics.processed_today}
          </div>
          <div style={{ height: 8, background: "#e0e0e0", borderRadius: 2 }}>
            <div style={{ height: 8, width: `${pct}%`, background: "#333", borderRadius: 2 }} />
          </div>
        </div>
      )}

      {isDashboard && metrics && (
        <div
          style={{
            border: "1px solid #2563eb",
            background: "#eff6ff",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            First-session goal: {claimsTowardGoal}/{sessionGoal} claims in your queue
          </div>
          <div style={{ height: 8, background: "#bfdbfe", borderRadius: 2, marginBottom: 8 }}>
            <div style={{ height: 8, width: `${sessionPct}%`, background: "#2563eb", borderRadius: 2 }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#1e3a8a" }}>
            Add more claims to maximize recovery —{" "}
            <Link href="/start" style={{ color: "#1d4ed8" }}>
              add another
            </Link>
          </p>
        </div>
      )}

      {batchOpen && (
        <div style={{ border: "1px solid #999", padding: 12, marginBottom: 16, background: "#fafafa" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            Supports <code>claim_number</code>, <code>payer</code>, <code>date_of_service</code>, CPT, ICD-10, denial codes,{" "}
            <code>billed_amount</code> / paid amounts, and <code>denial_reason</code> (required per row). All data rows are
            imported— not limited to the first row.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input
              placeholder="Default provider_name"
              value={defaults.provider_name}
              onChange={(e) => setDefaults((d) => ({ ...d, provider_name: e.target.value }))}
              style={{ padding: 6, flex: "1 1 140px" }}
            />
            <input
              placeholder="Default provider_npi"
              value={defaults.provider_npi}
              onChange={(e) => setDefaults((d) => ({ ...d, provider_npi: e.target.value }))}
              style={{ padding: 6, flex: "1 1 120px" }}
            />
            <input
              placeholder="Default patient_id"
              value={defaults.patient_id}
              onChange={(e) => setDefaults((d) => ({ ...d, patient_id: e.target.value }))}
              style={{ padding: 6, flex: "1 1 120px" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => void submitBatchCsv()} style={{ marginLeft: 8, padding: "6px 12px" }}>
              Upload CSV
            </button>
          </div>
          <p style={{ fontSize: 13, margin: "8px 0" }}>Or paste JSON array of row objects:</p>
          <textarea
            value={batchRows}
            onChange={(e) => setBatchRows(e.target.value)}
            rows={5}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box" }}
            placeholder='[{"claim_number":"123","payer":"Acme","denial_reason":"CO-50","billed_amount":500}]'
          />
          <button type="button" onClick={() => void submitBatchJson()} style={{ marginTop: 8, padding: "6px 12px" }}>
            Submit JSON rows
          </button>
          {batchMsg && <p style={{ fontSize: 13, marginTop: 8 }}>{batchMsg}</p>}

          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #ccc" }} />
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Batch generate appeals (PDFs + ZIP)</h3>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            Columns: <code>claim_number</code>, <code>payer</code>, <code>date_of_service</code>, <code>cpt_codes</code>,{" "}
            <code>icd_codes</code>, <code>modifiers</code>, <code>carc_codes</code>, <code>rarc_codes</code>,{" "}
            <code>billed_amount</code>, <code>paid_amount</code>. Max 50 rows. Uses credits per successful appeal.
          </p>
          <div style={{ marginBottom: 8 }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setAppealZipCsv(e.target.files?.[0] || null)} />
            <button type="button" disabled={appealZipBusy} onClick={() => void startBatchAppealZip()} style={{ marginLeft: 8, padding: "6px 12px" }}>
              {appealZipBusy ? "Processing…" : "Generate appeals + ZIP"}
            </button>
          </div>
          {appealZipBusy && !zipStatus && <p style={{ fontSize: 13, marginTop: 4 }}>Starting batch…</p>}
          {appealZipBusy && zipStatus && Number(zipStatus.total) > 0 && (
            <p style={{ fontSize: 13, marginTop: 4 }}>
              Processing {String(zipStatus.total)} claims… ({String(zipStatus.current)}/{String(zipStatus.total)})
            </p>
          )}
          {appealZipDoneId && (
            <p style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>
              {String(zipStatus?.ok_count ?? 0)} Appeals Generated
              {zipStatus?.error ? ` — ${String(zipStatus.error)}` : ""}
            </p>
          )}
          {appealZipDoneId && (
            <button type="button" onClick={() => void downloadAppealZip()} style={{ marginTop: 8, padding: "8px 14px" }}>
              Download ZIP
            </button>
          )}
          {appealZipErr && <p style={{ fontSize: 13, marginTop: 8, color: "#b00020" }}>{appealZipErr}</p>}
        </div>
      )}

      <RecoveryClaimsTable
        claims={processedClaims as QueueRow[]}
        loading={listLoading}
        onRefresh={refreshQueueAndMetrics}
        queuePagination={queuePagination}
      />
    </div>
  );
}
