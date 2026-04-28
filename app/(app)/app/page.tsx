import { redirect } from "next/navigation";
import { hasAppealDataForUser, normalizeUserEmail } from "@/lib/auth/user-payload";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

/**
 * Hub after /app: send users to dashboard if they have appeals, else onboarding upload.
 */
export default async function AppEntryPage() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  const email = normalizeUserEmail(authData.user.email);
  if (!email) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  const svc = createServiceRoleClient();
  const { data: row, error: rowErr } = await svc.from("users").select("id").eq("email", email).maybeSingle();
  if (rowErr || !row) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  const hasData = await hasAppealDataForUser(authData.user.id);
  if (hasData) {
    redirect("/dashboard");
  }
  redirect("/upload");
}
