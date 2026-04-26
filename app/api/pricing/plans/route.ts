import { NextResponse } from "next/server";
import { RETAIL_PRICE, SUBSCRIPTION_TIERS } from "@/lib/pricing/constants";

/** Same shape as Flask GET /api/pricing/plans */
export async function GET() {
  return NextResponse.json(
    {
      retail_price: RETAIL_PRICE,
      subscription_tiers: SUBSCRIPTION_TIERS,
    },
    { status: 200 }
  );
}
