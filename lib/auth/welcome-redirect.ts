/** Canonical /welcome URL for auth redirects (Supabase recovery / magic link). */
export function getWelcomeRedirectUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://denialappealpro.com").replace(/\/$/, "");
  return `${base}/welcome`;
}
