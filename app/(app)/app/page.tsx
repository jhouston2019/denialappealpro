import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { hasAppealDataForUser } from "@/lib/auth/user-payload";

/**
 * Hub after /app: send users to dashboard if they have appeals, else onboarding upload.
 */
export default async function AppEntryPage() {
  const supabase = await createClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  const svc = createServiceRoleClient();
  const { data: row, error: rowErr } = await svc.from("users").select("id").eq("id", authData.user.id).maybeSingle();
  if (rowErr || !row) {
    redirect("/login?next=" + encodeURIComponent("/app"));
  }

  const hasData = await hasAppealDataForUser(authData.user.id);
  if (hasData) {
    redirect("/dashboard");
  }
  redirect("/upload");
}
