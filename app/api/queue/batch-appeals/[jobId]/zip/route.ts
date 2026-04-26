import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requirePaidCustomer } from "@/lib/api/require-paid-customer";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const r = await requirePaidCustomer();
  if (!r.ok) return r.response;
  const { jobId } = await context.params;
  const svc = createServiceRoleClient();
  const { data, error } = await svc
    .from("batch_appeal_jobs")
    .select("user_id, status, zip_path")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((data as { user_id: string }).user_id !== r.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { error: "Batch not ready yet", status: (data as { status: string }).status },
    { status: 400 }
  );
}
