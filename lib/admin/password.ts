import { createHash } from "crypto";

/** Matches backend/admin_auth.py AdminAuth static salt. */
const SALT = "denial_appeal_pro_admin_salt_2026";

export function hashPassword(password: string): string {
  return createHash("sha256").update(SALT + password).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) === passwordHash;
}
