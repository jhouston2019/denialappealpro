import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <h1>Admin dashboard</h1>
      <p>
        The CRA <code>AdminDashboard.js</code> can be pointed at the same API paths. Data sources:
        <code> /api/admin/dashboard/stats</code>, <code>/api/admin/appeals</code>, <code>
          /api/admin/users
        </code>
        .
      </p>
      <p>
        <Link href="/api/admin/verify" target="_blank" rel="noreferrer">
          /api/admin/verify
        </Link>{" "}
        (with session cookie) checks the admin row again.
      </p>
    </div>
  );
}
