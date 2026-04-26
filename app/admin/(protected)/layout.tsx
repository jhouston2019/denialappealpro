import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminFromCookie } from "@/lib/admin/require-admin";

/**
 * Server guard: re-check public.admins. Skipped for /admin/login (sibling, not under (protected)).
 */
export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const res = await getAdminFromCookie();
  if ("error" in res) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
