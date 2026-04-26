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
    .select("status, job_kind, total, current, ok_count, error, user_id")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((data as { user_id: string }).user_id !== r.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const j = data as {
    status: string;
    job_kind: string;
    total: number | null;
    current: number | null;
    ok_count: number | null;
    error: string | null;
  };
  return NextResponse.json(
    {
      status: j.status,
      job_kind: j.job_kind || "csv",
      total: j.total ?? 0,
      current: j.current ?? 0,
      ok_count: j.ok_count,
      error: j.error,
    },
    { status: 200 }
  );
}
