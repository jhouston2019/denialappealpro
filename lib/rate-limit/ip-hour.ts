type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const PRUNE_EVERY = 100;

function prune(now: number): void {
  if (store.size < PRUNE_EVERY) return;
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

/**
 * In-memory fixed window rate limiter (best-effort for serverless / single instance).
 */
export function checkIpHourLimit(ip: string, maxPerHour: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const key = ip || "unknown";
  let b = store.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    store.set(key, b);
    return { ok: true };
  }
  b.count += 1;
  if (b.count > maxPerHour) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim().slice(0, 128);
  return "unknown";
}
