import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "dap_admin_session";
const HOURS = 8;

function secret(): string {
  const s = process.env.ADMIN_AUTH_SECRET;
  if (!s) {
    throw new Error("ADMIN_AUTH_SECRET is not set (required for admin session HMAC)");
  }
  return s;
}

/**
 * HMAC-signed payload, no server session store. Same string can be used as Bearer token for the CRA.
 */
export function createAdminToken(adminId: number): string {
  const exp = Math.floor(Date.now() / 1000) + HOURS * 3600;
  const payload = Buffer.from(JSON.stringify({ a: adminId, exp })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseAdminToken(token: string): number | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  try {
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    a?: number;
    exp?: number;
  };
  if (typeof data.a !== "number" || typeof data.exp !== "number") return null;
  if (data.exp * 1000 < Date.now()) return null;
  return data.a;
}

export const ADMIN_SESSION_COOKIE = COOKIE;

export function maxAgeSec(): number {
  return HOURS * 3600;
}
