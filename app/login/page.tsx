import Link from "next/link";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px" }}>
      <h1>Sign in</h1>
      <p style={{ color: "#475569" }}>
        The Next app will use the same <code>/api/auth/login</code> contract as the Flask app. A full
        login UI is ported in a later phase.
      </p>
      <p>
        <Link href="/welcome">After checkout → welcome</Link>
        {" · "}
        <Link href="/pricing">Pricing</Link>
      </p>
    </div>
  );
}
