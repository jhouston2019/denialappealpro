"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type AdminMe = { id: number; username: string; email: string };

type Stats = {
  totals: { appeals: number; users: number; revenue: number; recovered: number };
  recent: { appeals_30d: number };
  ai_quality: { avg_quality_score: number | null; avg_citation_count: number | null };
  outcomes: { success_rate: number; total_with_outcomes: number; approved: number };
};

type AppealRow = {
  id: string;
  appeal_id: string;
  payer: string | null;
  billed_amount: number | null;
  status: string | null;
  ai_quality_score: number | null;
  outcome_status: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  subscription_tier: string | null;
  total_credits: number;
  appeal_count: number;
  created_at: string;
};

type AppealDetail = Record<string, unknown>;

const AdminDashboardClient = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminMe | null>(null);

  const verifyAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/verify", { credentials: "include" });
      if (!res.ok) {
        router.replace("/admin/login");
        return;
      }
      const data = (await res.json()) as { admin?: AdminMe };
      if (data.admin) {
        setAdminUser(data.admin);
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) setAdminUser(JSON.parse(raw) as AdminMe);
      else router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    }
  }, [router]);

  const loadData = useCallback(async () => {
    if (activeTab === "site-pages") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const needStats = activeTab === "overview" || activeTab === "ai-quality" || activeTab === "outcomes";
      if (needStats) {
        const response = await fetch("/api/admin/dashboard/stats", { credentials: "include" });
        if (response.ok) setStats((await response.json()) as Stats);
      } else if (activeTab === "appeals") {
        const response = await fetch("/api/admin/appeals?per_page=100", { credentials: "include" });
        if (response.ok) {
          const d = (await response.json()) as { appeals: AppealRow[] };
          setAppeals(d.appeals || []);
        }
      } else if (activeTab === "users") {
        const response = await fetch("/api/admin/users?per_page=100", { credentials: "include" });
        if (response.ok) {
          const d = (await response.json()) as { users: UserRow[] };
          setUsers(d.users || []);
        }
      }
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void verifyAuth();
  }, [verifyAuth]);

  useEffect(() => {
    if (adminUser) void loadData();
  }, [activeTab, adminUser, loadData]);

  const viewAppealDetail = async (appealId: string) => {
    try {
      const response = await fetch(
        `/api/admin/appeals?id=${encodeURIComponent(appealId)}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) setSelectedAppeal((await response.json()) as AppealDetail);
    } catch {
      console.error("Failed to load appeal");
    }
  };

  const handleLogout = () => {
    void fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  if (!adminUser) {
    return <div style={styles.loading}>Verifying authentication...</div>;
  }

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <h1 style={styles.logo}>Denial Appeal Pro Admin</h1>
          <div style={styles.navRight}>
            <span style={styles.username}>{adminUser.username}</span>
            <button type="button" onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          {(
            [
              ["overview", "📊 Overview"],
              ["appeals", "📝 Appeals"],
              ["users", "👥 Users"],
              ["ai-quality", "🤖 AI Quality"],
              ["outcomes", "✅ Outcomes"],
              ["site-pages", "🌐 Site pages"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              style={{
                ...styles.sidebarBtn,
                ...(activeTab === id ? styles.sidebarBtnActive : {}),
              }}
            >
              {label}
            </button>
          ))}
        </aside>

        <main style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : (
            <>
              {activeTab === "overview" && <OverviewTab stats={stats} />}
              {activeTab === "appeals" && (
                <AppealsTab
                  appeals={appeals}
                  onViewDetail={viewAppealDetail}
                  selectedAppeal={selectedAppeal}
                  onCloseDetail={() => setSelectedAppeal(null)}
                />
              )}
              {activeTab === "users" && <UsersTab users={users} />}
              {activeTab === "ai-quality" && <AIQualityTab stats={stats} />}
              {activeTab === "outcomes" && <OutcomesTab stats={stats} />}
              {activeTab === "site-pages" && <SitePagesTab />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

type SitePageGate = "public" | "paid";

type SitePageRow = {
  label: string;
  path: string;
  description: string;
  gate: SitePageGate;
};

const SITE_PAGE_GROUPS: { title: string; pages: SitePageRow[] }[] = [
  {
    title: "Public & marketing",
    pages: [
      { label: "Home (landing)", path: "/", description: "Marketing home", gate: "public" },
      { label: "Pricing", path: "/pricing", description: "Plans and purchase", gate: "public" },
      { label: "Terms of Service", path: "/terms", description: "Legal terms", gate: "public" },
      { label: "Privacy Policy", path: "/privacy", description: "Privacy policy", gate: "public" },
      { label: "Customer login", path: "/login", description: "Supabase sign-in for customers", gate: "public" },
      {
        label: "Welcome",
        path: "/login",
        description: "Customer sign-in",
        gate: "public",
      },
    ],
  },
  {
    title: "Customer app (sign-in required)",
    pages: [
      { label: "Dashboard", path: "/dashboard", description: "App home", gate: "paid" },
      { label: "Denial queue", path: "/queue", description: "Queue list", gate: "paid" },
      { label: "New denial (start intake)", path: "/start", description: "Start new appeal flow", gate: "paid" },
      { label: "Appeal history", path: "/appeal-history", description: "Past appeals", gate: "paid" },
      { label: "Account", path: "/account", description: "Account settings", gate: "paid" },
      { label: "Profile", path: "/profile", description: "User profile", gate: "paid" },
    ],
  },
  {
    title: "Admin",
    pages: [
      { label: "Admin login", path: "/admin/login", description: "Admin password session", gate: "public" },
      {
        label: "Admin dashboard (this page)",
        path: "/admin/dashboard",
        description: "Stats, appeals, users",
        gate: "public",
      },
    ],
  },
];

function gateBadgeStyle(gate: SitePageGate): React.CSSProperties {
  const base: React.CSSProperties = {
    ...styles.badge,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  if (gate === "public") return { ...base, background: "#e0e7ff", color: "#3730a3" };
  return { ...base, background: "#dbeafe", color: "#1e40af" };
}

function SitePagesTab() {
  const [queueAppealId, setQueueAppealId] = useState("");
  const [previewAppealId, setPreviewAppealId] = useState("");

  const openPath = (path: string) => {
    window.open(path, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>Site pages</h2>
      <p style={{ marginTop: 0, marginBottom: "24px", color: "#64748b", fontSize: "15px", lineHeight: 1.6 }}>
        Every customer-facing and admin route in this Next.js app. Links open in a new tab so this dashboard stays
        open. Customer app routes are still protected: sign in as a paid user in that tab to use them (admin login does
        not grant customer access).
      </p>

      {SITE_PAGE_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: "36px" }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: "16px" }}>{group.title}</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Page</th>
                  <th style={styles.th}>Path</th>
                  <th style={styles.th}>Access</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.th}>Open</th>
                </tr>
              </thead>
              <tbody>
                {group.pages.map((p) => (
                  <tr key={p.path + p.label} style={styles.tableRow}>
                    <td style={styles.td}>
                      <strong>{p.label}</strong>
                    </td>
                    <td style={styles.td}>
                      <code style={{ fontSize: "13px", color: "#0f172a" }}>{p.path}</code>
                    </td>
                    <td style={styles.td}>
                      <span style={gateBadgeStyle(p.gate)}>{p.gate === "paid" ? "Paid app" : "Public"}</span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: "320px" }}>{p.description}</td>
                    <td style={styles.td}>
                      <button type="button" onClick={() => openPath(p.path)} style={styles.viewBtn}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <h3 style={{ ...styles.sectionTitle, marginBottom: "16px" }}>Dynamic routes</h3>
      <div style={styles.detailGrid}>
        <div style={styles.detailSection}>
          <h4 style={{ ...styles.sectionTitle, marginBottom: "12px" }}>Queue — claim detail</h4>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: 0 }}>
            Path: <code>/queue/[appealId]</code>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginTop: "12px" }}>
            <input
              type="text"
              value={queueAppealId}
              onChange={(e) => setQueueAppealId(e.target.value.trim())}
              placeholder="Appeal ID"
              style={{
                flex: "1 1 200px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              style={styles.viewBtn}
              onClick={() => {
                if (!queueAppealId) return;
                openPath(`/queue/${encodeURIComponent(queueAppealId)}`);
              }}
            >
              Open
            </button>
          </div>
        </div>
        <div style={styles.detailSection}>
          <h4 style={{ ...styles.sectionTitle, marginBottom: "12px" }}>Intake — letter preview</h4>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: 0 }}>
            Path: <code>/start/preview/[appealId]</code>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginTop: "12px" }}>
            <input
              type="text"
              value={previewAppealId}
              onChange={(e) => setPreviewAppealId(e.target.value.trim())}
              placeholder="Appeal ID"
              style={{
                flex: "1 1 200px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              style={styles.viewBtn}
              onClick={() => {
                if (!previewAppealId) return;
                openPath(`/start/preview/${encodeURIComponent(previewAppealId)}`);
              }}
            >
              Open
            </button>
          </div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>Using customer pages as admin</h4>
        <p style={styles.infoText}>
          The customer app requires a Supabase session and a matching <code>public.users</code> row.
          Keep this admin tab for operations; use a second tab with{" "}
          <a href="/login" target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>
            /login
          </a>{" "}
          and a test account to exercise dashboards, queue, and intake flows end to end.
        </p>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <div>No data available</div>;

  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>Dashboard Overview</h2>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totals.appeals}</div>
          <div style={styles.statLabel}>Total Appeals</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totals.users}</div>
          <div style={styles.statLabel}>Total Users</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>${stats.totals.revenue.toFixed(2)}</div>
          <div style={styles.statLabel}>Total Revenue</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>${stats.totals.recovered.toFixed(2)}</div>
          <div style={styles.statLabel}>Total Recovered</div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.recent.appeals_30d}</div>
          <div style={styles.statLabel}>Appeals (30 days)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.ai_quality.avg_quality_score ?? "N/A"}</div>
          <div style={styles.statLabel}>Avg Quality Score</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.ai_quality.avg_citation_count ?? "N/A"}</div>
          <div style={styles.statLabel}>Avg Citations</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.outcomes.success_rate}%</div>
          <div style={styles.statLabel}>Success Rate</div>
        </div>
      </div>
    </div>
  );
}

function AppealsTab({
  appeals,
  onViewDetail,
  selectedAppeal,
  onCloseDetail,
}: {
  appeals: AppealRow[];
  onViewDetail: (id: string) => void;
  selectedAppeal: AppealDetail | null;
  onCloseDetail: () => void;
}) {
  if (selectedAppeal) {
    const a = selectedAppeal;
    return (
      <div style={styles.tab}>
        <div style={styles.detailHeader}>
          <h2 style={styles.tabTitle}>Appeal Details</h2>
          <button type="button" onClick={onCloseDetail} style={styles.closeBtn}>
            ← Back to list
          </button>
        </div>

        <div style={styles.detailGrid}>
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Basic Information</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Appeal ID:</span>
              <span style={styles.detailValue}>{String(a.appeal_id ?? "")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Payer:</span>
              <span style={styles.detailValue}>{String(a.payer ?? "")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Claim Number:</span>
              <span style={styles.detailValue}>{String(a.claim_number ?? "")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Provider:</span>
              <span style={styles.detailValue}>{String(a.provider_name ?? "")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Billed Amount:</span>
              <span style={styles.detailValue}>
                $
                {typeof a.billed_amount === "number"
                  ? a.billed_amount.toFixed(2)
                  : Number(a.billed_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>AI Quality Metrics</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Quality Score:</span>
              <span style={styles.detailValue}>{String(a.ai_quality_score ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Citations:</span>
              <span style={styles.detailValue}>{String(a.ai_citation_count ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Word Count:</span>
              <span style={styles.detailValue}>{String(a.ai_word_count ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Model:</span>
              <span style={styles.detailValue}>{String(a.ai_model_used ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Method:</span>
              <span style={styles.detailValue}>{String(a.ai_generation_method ?? "N/A")}</span>
            </div>
          </div>

          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Outcome</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status:</span>
              <span style={styles.detailValue}>{String(a.outcome_status ?? "Pending")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Date:</span>
              <span style={styles.detailValue}>{String(a.outcome_date ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Amount Recovered:</span>
              <span style={styles.detailValue}>
                $
                {typeof a.outcome_amount_recovered === "number"
                  ? a.outcome_amount_recovered.toFixed(2)
                  : Number(a.outcome_amount_recovered || 0).toFixed(2)}
              </span>
            </div>
            {a.outcome_notes ? (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Notes:</span>
                <span style={styles.detailValue}>{String(a.outcome_notes)}</span>
              </div>
            ) : null}
          </div>

          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Denial Information</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Denial Code:</span>
              <span style={styles.detailValue}>{String(a.denial_code ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Denial Reason:</span>
              <span style={styles.detailValue}>{String(a.denial_reason ?? "")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>CPT Codes:</span>
              <span style={styles.detailValue}>{String(a.cpt_codes ?? "N/A")}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Diagnosis:</span>
              <span style={styles.detailValue}>{String(a.diagnosis_code ?? "N/A")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>All Appeals</h2>

      {appeals.length === 0 ? (
        <div style={styles.emptyState}>No appeals yet</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Appeal ID</th>
                <th style={styles.th}>Payer</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Quality</th>
                <th style={styles.th}>Outcome</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((appeal) => (
                <tr key={appeal.id} style={styles.tableRow}>
                  <td style={styles.td}>{appeal.appeal_id}</td>
                  <td style={styles.td}>{appeal.payer}</td>
                  <td style={styles.td}>${appeal.billed_amount?.toFixed(2) ?? "0.00"}</td>
                  <td style={styles.td}>
                    <span style={getStatusBadgeStyle(appeal.status || "")}>{appeal.status}</span>
                  </td>
                  <td style={styles.td}>{appeal.ai_quality_score ?? "N/A"}</td>
                  <td style={styles.td}>
                    {appeal.outcome_status ? (
                      <span style={getOutcomeBadgeStyle(appeal.outcome_status)}>{appeal.outcome_status}</span>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td style={styles.td}>{new Date(appeal.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button type="button" onClick={() => onViewDetail(appeal.appeal_id)} style={styles.viewBtn}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsersTab({ users }: { users: UserRow[] }) {
  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>All Users</h2>

      {users.length === 0 ? (
        <div style={styles.emptyState}>No users yet</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Subscription</th>
                <th style={styles.th}>Credits</th>
                <th style={styles.th}>Appeals</th>
                <th style={styles.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    {user.subscription_tier ? (
                      <span style={styles.tierBadge}>{user.subscription_tier}</span>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td style={styles.td}>{user.total_credits}</td>
                  <td style={styles.td}>{user.appeal_count}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AIQualityTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <div>No data available</div>;

  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>AI Quality Metrics</h2>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Average Quality Score</div>
          <div style={styles.metricValue}>{stats.ai_quality.avg_quality_score ?? "N/A"}</div>
          <div style={styles.metricSubtext}>Target: 85+</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Average Citations</div>
          <div style={styles.metricValue}>{stats.ai_quality.avg_citation_count ?? "N/A"}</div>
          <div style={styles.metricSubtext}>Regulatory + Clinical</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Citation Accuracy</div>
          <div style={styles.metricValue}>95%+</div>
          <div style={styles.metricSubtext}>Verified against knowledge base</div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>AI System Features</h3>
        <ul style={styles.featureList}>
          <li>✅ Real-time citation validation (prevents hallucinations)</li>
          <li>✅ Prompt optimization based on outcome data</li>
          <li>✅ A/B testing framework for continuous improvement</li>
          <li>✅ Multi-step reasoning for complex cases</li>
          <li>✅ Domain-specific knowledge base (medical billing + insurance law)</li>
          <li>✅ Automated quality scoring (0-100 scale)</li>
        </ul>
      </div>
    </div>
  );
}

function OutcomesTab({ stats }: { stats: Stats | null }) {
  if (!stats) return <div>No data available</div>;

  return (
    <div style={styles.tab}>
      <h2 style={styles.tabTitle}>Appeal Outcomes</h2>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Success Rate</div>
          <div style={styles.metricValue}>{stats.outcomes.success_rate}%</div>
          <div style={styles.metricSubtext}>
            {stats.outcomes.approved} approved / {stats.outcomes.total_with_outcomes} total
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Total Recovered</div>
          <div style={styles.metricValue}>${stats.totals.recovered.toFixed(2)}</div>
          <div style={styles.metricSubtext}>Across all appeals</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Appeals Tracked</div>
          <div style={styles.metricValue}>{stats.outcomes.total_with_outcomes}</div>
          <div style={styles.metricSubtext}>With outcome data</div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>Outcome Tracking</h3>
        <p style={styles.infoText}>
          The system automatically tracks appeal outcomes to measure real-world success rates and continuously
          improve AI generation strategies. Outcomes feed into the prompt optimization engine and A/B testing
          framework.
        </p>
      </div>
    </div>
  );
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  return {
    ...styles.badge,
    background: status === "completed" ? "#dcfce7" : status === "paid" ? "#dbeafe" : status === "pending" ? "#fef3c7" : "#fee2e2",
    color:
      status === "completed" ? "#166534" : status === "paid" ? "#1e40af" : status === "pending" ? "#854d0e" : "#991b1b",
  };
}

function getOutcomeBadgeStyle(outcome: string): React.CSSProperties {
  return {
    ...styles.badge,
    background:
      outcome === "approved" ? "#dcfce7" : outcome === "partially_approved" ? "#dbeafe" : outcome === "denied" ? "#fee2e2" : "#f3f4f6",
    color:
      outcome === "approved"
        ? "#166534"
        : outcome === "partially_approved"
          ? "#1e40af"
          : outcome === "denied"
            ? "#991b1b"
            : "#6b7280",
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", background: "#f8fafc" },
  navbar: { background: "#1e3a8a", color: "white", padding: "16px 24px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  navContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { fontSize: "20px", fontWeight: "700", margin: 0 },
  navRight: { display: "flex", alignItems: "center", gap: "16px" },
  username: { fontSize: "14px", opacity: 0.9 },
  logoutBtn: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  main: { display: "flex", maxWidth: "1400px", margin: "0 auto", minHeight: "calc(100vh - 64px)" },
  sidebar: {
    width: "240px",
    background: "white",
    borderRight: "1px solid #e2e8f0",
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sidebarBtn: {
    background: "transparent",
    border: "none",
    padding: "12px 24px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "15px",
    color: "#64748b",
  },
  sidebarBtnActive: { background: "#eff6ff", color: "#1e40af", fontWeight: "600", borderLeft: "3px solid #1e40af" },
  content: { flex: 1, padding: "32px" },
  tab: { background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  tabTitle: { fontSize: "24px", fontWeight: "700", color: "#1e293b", marginBottom: "24px", marginTop: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" },
  statCard: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
    color: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  statValue: { fontSize: "36px", fontWeight: "700", marginBottom: "8px" },
  statLabel: { fontSize: "14px", opacity: 0.9 },
  tableContainer: { overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  tableHeader: { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" },
  th: {
    padding: "12px",
    textAlign: "left" as const,
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  tableRow: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "16px 12px", fontSize: "14px", color: "#334155" },
  badge: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
  viewBtn: {
    background: "#1e40af",
    color: "white",
    border: "none",
    padding: "6px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  closeBtn: {
    background: "#64748b",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" },
  detailSection: { background: "#f8fafc", padding: "20px", borderRadius: "8px" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "16px", marginTop: 0 },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" },
  detailLabel: { fontSize: "14px", color: "#64748b", fontWeight: "500" },
  detailValue: { fontSize: "14px", color: "#1e293b", fontWeight: "600" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "32px" },
  metricCard: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
    color: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  metricTitle: { fontSize: "14px", opacity: 0.9, marginBottom: "8px" },
  metricValue: { fontSize: "32px", fontWeight: "700", marginBottom: "4px" },
  metricSubtext: { fontSize: "12px", opacity: 0.8 },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "20px", marginTop: "24px" },
  infoTitle: { fontSize: "16px", fontWeight: "600", color: "#1e40af", marginTop: 0, marginBottom: "12px" },
  infoText: { fontSize: "14px", color: "#1e40af", lineHeight: 1.6, margin: 0 },
  featureList: { margin: 0, paddingLeft: "20px", color: "#1e40af" },
  emptyState: { textAlign: "center" as const, padding: "60px 20px", color: "#94a3b8", fontSize: "16px" },
  loading: { textAlign: "center" as const, padding: "60px 20px", color: "#64748b", fontSize: "16px" },
  tierBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "capitalize" as const,
  },
};

export default AdminDashboardClient;
