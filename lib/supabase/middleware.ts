import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { type NextRequest, NextResponse } from "next/server";
import { DAP_PATHNAME_HEADER } from "@/lib/app/middleware-headers";

type CookieToSet = { name: string; value: string; options: CookieSerializeOptions };

/**
 * Supabase session refresh for every matched request. Required for RSC to see
 * the same session as the browser after `signInWithPassword`.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const currentPath = `${pathname}${search}`;

  if (!url || !key) {
    const h = new Headers(request.headers);
    h.set(DAP_PATHNAME_HEADER, currentPath);
    return NextResponse.next({ request: { headers: h } });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(DAP_PATHNAME_HEADER, currentPath);

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
