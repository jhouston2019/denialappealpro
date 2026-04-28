/** Client- and server-safe: no `next/headers` or Supabase server imports. */
export function normalizeUserEmail(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e || null;
}
