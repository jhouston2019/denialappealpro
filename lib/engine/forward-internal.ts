/**
 * Proxy to the internal engine (Fly.io Flask) for extraction and generation.
 * Set INTERNAL_FLASK_BASE_URL (or NEXT_PUBLIC_FLASK_API_URL) to the same Fly URL.
 * For `/api/extract/*` the engine does not require Authorization (extraction is stateless).
 * Optional `accessToken` is forwarded as Bearer when present; omitted for anonymous users.
 */

export type EngineExtractPath = "/api/extract/file" | "/api/extract/text";

export function getInternalFlaskBaseUrl(): string | null {
  const base = (
    process.env.INTERNAL_FLASK_BASE_URL ||
    process.env.INTERNAL_ENGINE_BASE_URL ||
    process.env.NEXT_PUBLIC_FLASK_API_URL
  )?.replace(/\/$/, "");
  return base || null;
}

export async function forwardToInternalEngine(
  path: EngineExtractPath,
  init: RequestInit,
  accessToken: string | null
): Promise<Response | null> {
  const base = getInternalFlaskBaseUrl();
  if (!base) return null;
  const url = `${base}${path}`;
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(url, { ...init, headers });
}
