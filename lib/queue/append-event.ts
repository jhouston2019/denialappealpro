import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function appendClaimEvent(
  appealDbId: number,
  userId: string,
  eventType: string,
  message: string | null
): Promise<void> {
  const svc = createServiceRoleClient();
  await svc.from("claim_status_events").insert({
    appeal_db_id: appealDbId,
    user_id: userId,
    event_type: eventType,
    message: message || "",
  });
}
