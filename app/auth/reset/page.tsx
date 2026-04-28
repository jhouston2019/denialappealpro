import { Suspense } from "react";
import ResetPasswordClient from "@/components/auth/reset-password-client";

function Fallback() {
  return (
    <div style={{ padding: 48, textAlign: "center", fontFamily: "system-ui" }}>Loading…</div>
  );
}

export default function AuthResetPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
