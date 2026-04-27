import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes Supabase auth (required for RSC to see the session) and forwards
 * app headers for login `next` and Stripe return handling.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
