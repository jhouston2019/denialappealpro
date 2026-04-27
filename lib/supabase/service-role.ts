import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client only for server and Netlify functions.
 * Never import in client components.
 * Uses SUPABASE_SERVICE_ROLE_KEY (not the anon key) — required for `auth.admin` APIs
 * (e.g. `createUser`); the anon key cannot create auth users.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
