import { type NextRequest, NextResponse } from "next/server";
import { DAP_PATHNAME_HEADER, STRIPE_CHECKOUT_SESSION_HEADER } from "@/lib/stripe/middleware-constants";

/**
 * - Set path + search for `login?next=` in server layouts.
 * - For `/app?session_id=...`, pass session id to the server (layouts cannot read searchParams).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const currentPath = `${pathname}${search}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(DAP_PATHNAME_HEADER, currentPath);

  if (pathname === "/app") {
    const sid = request.nextUrl.searchParams.get("session_id");
    if (sid) {
      requestHeaders.set(STRIPE_CHECKOUT_SESSION_HEADER, sid);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
