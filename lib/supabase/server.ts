import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieSerializeOptions };

/**
 * Per-request Supabase **server** client: wraps `createServerClient` from `@supabase/ssr`
 * with Next.js `cookies()`. Use only in Server Components, Route Handlers, and Server Actions.
 *
 * This is the correct SSR session-aware client — not `lib/supabase/browser.ts`.
 * For privileged reads/writes, also use `createServiceRoleClient` where appropriate.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}
