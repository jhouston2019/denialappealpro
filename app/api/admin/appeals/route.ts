import { NextRequest } from "next/server";
import { getAppealsList } from "@/lib/api/admin-appeals-get";

/**
 * GET /api/admin/appeals — list
 */
export async function GET(request: NextRequest) {
  return getAppealsList(request);
}
