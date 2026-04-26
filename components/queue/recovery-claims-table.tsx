"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import api from "@/lib/api-client";
import { ApiError } from "@/lib/api/api-error";
import { calculatePriority } from "@/lib/queue/claim-priority";

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #0f172a",
  fontSize: 13,
  color: "#0f172a",
};
const td: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13,
  verticalAlign: "middle",
};

const TRACKING = [
  { value: "", label: "All statuses" },
  { value: "generated", label: "Generated" },
  { value: "submitted", label: "Submitted" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

function formatStatus(s: string) {
  const m: Record<string, string> = {
    generated: "Generated",
    submitted: "Submitted",
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
  };
  return m[(s || "").toLowerCase()] || s || "—";
}

function formatDos(iso: unknown) {
  if (!iso) return "—";
  const s = String(iso);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export type QueueRow = Record<string, unknown> & {
  appeal_id: string;
  claim_id: string;
  payer?: string;
  amount?: number;
  date_of_service?: string;
  appeal_tracking_status?: string;
  has_letter?: boolean;
  follow_up_eligible?: boolean;
  appeal_generation_kind?: string;
};

export type QueuePaginationConfig = {
  page: number;
  totalPages: number | null;
  totalClaims: number | null;
  countKnown: boolean;
  paginationTotalHint: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

type Props = {
  claims: QueueRow[];
  loading: boolean;
  onRefresh?: () => void;
  queuePagination?: QueuePaginationConfig;
};

function errMsg(e: unknown) {
  if (e instanceof ApiError) {
    const d = e.response.data;
    if (d && typeof d === "object") {
      if ("error" in d && d.error) return String((d as { error: string }).error);
      if ("follow_up_reason" in d && (d as { follow_up_reason?: string }).follow_up_reason) {
        return String((d as { follow_up_reason: string }).follow_up_reason);
      }
    }
  }
  return "Follow-up unavailable";
}

export default function RecoveryClaimsTable({ claims, loading, onRefresh, queuePagination }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [payerFilter, setPayerFilter] = useState("");
  const [fuBusy, setFuBusy] = useState<string | null>(null);

  const list = useMemo(() => (Array.isArray(claims) ? claims : []), [claims]);
  const isInitialLoad = Boolean(loading && list.length === 0);
  const isRefreshing = Boolean(loading && list.length > 0);

  const payers = useMemo(() => {
    const s = new Set<string>();
    list.forEach((c) => {
      if (c.payer) s.add(String(c.payer));
    });
    return [...s].sort();
  }, [list]);

  const rows = useMemo(() => {
    let rowList = [...list];
    if (statusFilter) {
      rowList = rowList.filter(
        (c) => (String(c.appeal_tracking_status || "").toLowerCase() === statusFilter.toLowerCase())
      );
    }
    if (payerFilter.trim()) {
      const q = payerFilter.trim().toLowerCase();
      rowList = rowList.filter((c) => (String(c.payer || "").toLowerCase().includes(q)));
    }
    rowList.sort(
      (a, b) => calculatePriority(b as Record<string, unknown>).priorityScore - calculatePriority(a as Record<string, unknown>).priorityScore
    );
    return rowList;
  }, [list, statusFilter, payerFilter]);

  const runFollowUp = useCallback(
    async (e: MouseEvent, appealId: string) => {
      e.preventDefault();
      setFuBusy(appealId);
      try {
        await api.post(`/api/queue/${appealId}/follow-up`, { days_no_response: 30 });
        onRefresh?.();
        router.push(`/queue/${appealId}`);
      } catch (err) {
        window.alert(errMsg(err));
      } finally {
        setFuBusy(null);
      }
    },
    [router, onRefresh]
  );

  const renderSkeletonRows = () =>
    [0, 1, 2, 3, 4].map((k) => (
      <tr key={`sk-${k}`}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <td key={i} style={{ ...td, padding: "12px 10px" }}>
            <div
              style={{
                height: 14,
                borderRadius: 4,
                background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                backgroundSize: "200% 100%",
                animation: "rqshimmer 1.2s ease-in-out infinite",
                maxWidth: i === 1 ? 120 : i === 4 ? 80 : "100%",
              }}
            />
          </td>
        ))}
      </tr>
    ));

  const renderEmptyState = (message: string, showAddLink: boolean) => (
    <tr>
      <td colSpan={7} style={{ ...td, color: "#64748b", padding: 20 }}>
        {message}{" "}
        {showAddLink && (
          <Link href="/start" style={{ color: "#1d4ed8", fontWeight: 600 }}>
            Add a claim
          </Link>
        )}
      </td>
    </tr>
  );

  const renderRows = () =>
    rows.map((c) => {
      const pr = calculatePriority(c as Record<string, unknown>);
      const id = String(c.appeal_id);
      const fuOk = Boolean(c.follow_up_eligible) && c.appeal_generation_kind !== "follow_up";
      return (
        <tr key={id}>
          <td style={td}>{c.claim_id}</td>
          <td style={td}>{c.payer}</td>
          <td style={td}>{formatDos(c.date_of_service)}</td>
          <td style={td}>${Number(c.amount).toFixed(2)}</td>
          <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{pr.label}</td>
          <td style={td}>{formatStatus(String(c.appeal_tracking_status || ""))}</td>
          <td style={td}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <Link href={`/queue/${c.appeal_id}`} style={{ color: "#1d4ed8", fontWeight: 600, fontSize: 13 }}>
                View appeal
              </Link>
              {c.has_letter && (
                <a
                  href={`/api/queue/${c.appeal_id}/export?mode=appeal`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#059669", fontWeight: 600, fontSize: 13 }}
                >
                  Download PDF
                </a>
              )}
              {fuOk && (
                <button
                  type="button"
                  disabled={fuBusy === id}
                  onClick={(e) => void runFollowUp(e, id)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: fuBusy === id ? "wait" : "pointer",
                    border: "1px solid #0f172a",
                    background: "#fff",
                    color: "#0f172a",
                    borderRadius: 6,
                  }}
                >
                  {fuBusy === id ? "…" : "Generate Follow-Up Appeal"}
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });

  return (
    <div>
      <style>{`
        @keyframes rqshimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes rqspin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: "#334155" }}>
          Status{" "}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 6, padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
          >
            {TRACKING.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#334155" }}>
          Payer{" "}
          <input
            list="recovery-payer-filter"
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            placeholder="Filter…"
            style={{
              marginLeft: 6,
              padding: "6px 10px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              minWidth: 160,
            }}
          />
        </label>
        <datalist id="recovery-payer-filter">
          {payers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>Highest Recovery First</span>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Claim #</th>
              <th style={th}>Payer</th>
              <th style={th}>Date of service</th>
              <th style={th}>Amount</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
            {isRefreshing && (
              <tr>
                <th
                  colSpan={7}
                  style={{
                    ...th,
                    borderBottom: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    textAlign: "center",
                    fontWeight: 500,
                    color: "#64748b",
                    padding: "10px 10px",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        border: "2px solid #cbd5e1",
                        borderTopColor: "#1d4ed8",
                        borderRadius: "50%",
                        animation: "rqspin 0.65s linear infinite",
                      }}
                    />
                    Updating list…
                  </span>
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {isInitialLoad
              ? renderSkeletonRows()
              : list.length > 0
                ? rows.length > 0
                  ? renderRows()
                  : renderEmptyState("No claims match your filters.", false)
                : renderEmptyState("No claims match.", true)}
          </tbody>
        </table>
      </div>

      {queuePagination && (queuePagination.canPrev || queuePagination.canNext) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={!queuePagination.canPrev || loading}
            onClick={queuePagination.onPrev}
            style={{ padding: "8px 16px", cursor: !queuePagination.canPrev ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ fontSize: 14, color: "#334155" }}>
            Page {queuePagination.page}
            {queuePagination.countKnown && queuePagination.totalPages != null && queuePagination.totalClaims != null
              ? ` of ${queuePagination.totalPages} (${queuePagination.totalClaims} claims)`
              : ""}
            {queuePagination.paginationTotalHint ? " — loading total…" : ""}
          </span>
          <button
            type="button"
            disabled={!queuePagination.canNext || loading}
            onClick={queuePagination.onNext}
            style={{ padding: "8px 16px", cursor: !queuePagination.canNext ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
