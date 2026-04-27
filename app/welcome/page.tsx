import { redirect } from "next/navigation";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const qs = sp.session_id
    ? `?session_id=${encodeURIComponent(sp.session_id)}`
    : "";
  redirect(`/success${qs}`);
}
