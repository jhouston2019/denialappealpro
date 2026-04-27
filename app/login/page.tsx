import { Suspense } from "react";
import LoginPageClient from "@/components/auth/login-page-client";

function LoginFallback() {
  return (
    <div style={{ padding: 48, textAlign: "center", fontFamily: "system-ui" }}>
      Loading…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
