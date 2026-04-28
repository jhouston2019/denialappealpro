import { NextResponse } from "next/server";
import { requirePaidAppUser } from "@/lib/api/require-authenticated-user";
import { getInternalFlaskBaseUrl } from "@/lib/engine/forward-internal";
import { getEngineAccessToken } from "@/lib/supabase/engine-access-token";

export const runtime = "nodejs";

/**
 * Professional PDF from the internal engine (ReportLab), proxied for same-origin download UX.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ appealId: string }> }
) {
  const r = await requirePaidAppUser();
  if (!r.ok) return r.response;

  const { appealId } = await context.params;
  if (!appealId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const accessToken = await getEngineAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getInternalFlaskBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "PDF engine not configured" }, { status: 503 });
  }

  const url = `${base}/api/generate/appeal/${encodeURIComponent(appealId)}/pdf`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { error?: string };
      return NextResponse.json({ error: j.error || "PDF failed" }, { status: res.status });
    }
    return NextResponse.json({ error: "PDF failed" }, { status: res.status });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const cd = res.headers.get("content-disposition") || 'attachment; filename="appeal.pdf"';
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": cd,
    },
  });
}
