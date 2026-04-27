import { SuccessClient } from "./success-client";

/** Avoid static prerender: page uses session, Stripe return query, and client-only storage. */
export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const sessionId = sp.session_id ?? null;
  return <SuccessClient sessionId={sessionId} />;
}
