import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 16 }}>
      <h1>Admin login</h1>
      <p style={{ color: "#64748b" }}>Server sets an httpOnly cookie; token is also returned for CRA compatibility.</p>
      <AdminLoginForm />
    </div>
  );
}
