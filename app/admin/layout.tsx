import type { ReactNode } from "react";

/** Shared /admin tree; the auth guard is in `(protected)/layout.tsx` (does not apply to /admin/login). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
