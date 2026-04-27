import { Suspense } from "react";
import RegisterPageClient from "@/components/auth/register-page-client";

function Fallback() {
  return <div style={{ padding: 48, textAlign: "center" }}>Loading…</div>;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <RegisterPageClient />
    </Suspense>
  );
}
