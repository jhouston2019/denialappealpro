/**
 * Optional proxy to a legacy Flask (or other) engine serving the same /api/parse/* paths.
 * Set INTERNAL_ENGINE_BASE_URL (e.g. http://127.0.0.1:5000) and optional INTERNAL_ENGINE_SECRET.
 */

export async function forwardToInternalEngine(
  path: "/api/parse/denial-letter" | "/api/parse/denial-text",
  init: RequestInit
): Promise<Response | null> {
  const base = process.env.INTERNAL_ENGINE_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  const url = `${base}${path}`;
  const headers = new Headers(init.headers);
  const secret = process.env.INTERNAL_ENGINE_SECRET;
  if (secret) headers.set("Authorization", `Bearer ${secret}`);
  return fetch(url, { ...init, headers });
}
