import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin/require-admin";

export async function GET(request: NextRequest) {
  const result = await getAdminFromRequest(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    {
      valid: true,
      admin: {
        id: result.admin.id,
        username: result.admin.username,
        email: result.admin.email,
      },
    },
    { status: 200 }
  );
}
