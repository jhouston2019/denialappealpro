import { Suspense } from "react";
import ClaimDetailClient from "@/components/queue/claim-detail-client";

export default function QueueAppealDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ClaimDetailClient />
    </Suspense>
  );
}
