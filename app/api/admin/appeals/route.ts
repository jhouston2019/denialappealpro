import { NextRequest } from "next/server";
import { getAppealDetail, getAppealsList } from "@/lib/api/admin-appeals-get";

/**
 * GET /api/admin/appeals — list (default)
 * GET /api/admin/appeals?id=... — single appeal detail (avoids extra route file on Windows/webpack)
 */
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    return getAppealDetail(request, id);
  }
  return getAppealsList(request);
}
