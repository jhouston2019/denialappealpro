import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { type NextRequest, NextResponse } from "next/server";
import { DAP_PATHNAME_HEADER, STRIPE_CHECKOUT_SESSION_HEADER } from "@/lib/stripe/middleware-constants";

type CookieToSet = { name: string; value: string; options: CookieSerializeOptions };

/**
 * Supabase + app headers for every matched request. Refreshing the session in
 * middleware is required for `signInWithPassword` (and RSC) to see the same
 * session; without this, `getUser()` in layouts often stays empty.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const { pathname, search } = request.nextUrl;
    const h = new Headers(request.headers);
    h.set(DAP_PATHNAME_HEADER, `${pathname}${search}`);
    if (pathname === "/app") {
      const sid = request.nextUrl.searchParams.get("session_id");
      if (sid) {
        h.set(STRIPE_CHECKOUT_SESSION_HEADER, sid);
      }
    }
    return NextResponse.next({ request: { headers: h } });
  }

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

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
