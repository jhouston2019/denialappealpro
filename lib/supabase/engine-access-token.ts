import { createClient } from "@/lib/supabase/server";

/**
 * Reads the current session JWT for Authorization: Bearer when proxying to the internal engine.
 * Call only after `getUser()` / `requireAuthenticatedUser()` has confirmed the request is authenticated.
 */
export async function getEngineAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
