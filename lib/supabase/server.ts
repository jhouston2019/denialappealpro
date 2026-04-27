import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieSerializeOptions };

/**
 * Per-request server client: reads/writes auth cookies. Use in Server Components, Route Handlers, Server Actions.
 * Never use for privileged DB reads; pair with createServiceRoleClient for public.users.
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
