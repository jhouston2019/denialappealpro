import { type NextRequest, NextResponse } from "next/server";
import { STRIPE_CHECKOUT_SESSION_HEADER } from "@/lib/stripe/middleware-constants";

/**
 * For `/app?session_id=...`, make session id available to the server (layouts cannot read searchParams).
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/app") {
    return NextResponse.next();
  }
  const sid = request.nextUrl.searchParams.get("session_id");
  if (!sid) {
    return NextResponse.next();
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(STRIPE_CHECKOUT_SESSION_HEADER, sid);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/app"] };
